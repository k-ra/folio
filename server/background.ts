import type { IncomingMessage, ServerResponse } from 'node:http'
import { HttpError, jsonResponse, readBody, type Env } from './http.js'
import { validBackgroundResult } from '../src/style/backgrounds.js'
import { backgroundPayload, validBackgroundRequest } from './backgroundContract.js'
import { connectionStatus, generateText } from './textModel.js'

/** Shared handler for local development and Vercel; credentials stay request-scoped. */
export function createBackgroundHandler(env: Env) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const json = (status: number, body: unknown) => jsonResponse(res, status, body)
    if (req.method !== 'POST' || req.url !== '/') return json(404, { error: 'Not found' })
    if (
      req.headers.origin !== `http://${req.headers.host}` &&
      req.headers.origin !== `https://${req.headers.host}`
    )
      return json(403, { error: 'Use the Folio editor to generate a background.' })
    if (!connectionStatus(env).configured)
      return json(503, {
        error:
          'Configure a model connection in .env.local and restart the development server to generate a background. You can still edit CSS.',
      })
    const abort = new AbortController()
    const timeout = setTimeout(() => abort.abort(), 90000)
    res.on('close', () => {
      if (!res.writableEnded) abort.abort()
    })
    try {
      const body = await readBody(req, 160000)
      let request: unknown
      try {
        request = JSON.parse(body)
      } catch {
        return json(400, { error: 'The background request is invalid.' })
      }
      if (!validBackgroundRequest(request)) return json(400, { error: 'The background request is invalid.' })
      const text = await generateText(
        env,
        backgroundPayload(request, env.FOLIO_TEXT_MODEL || 'gpt-6-astra'),
        abort.signal,
      )
      const output: unknown = JSON.parse(text || '{}')
      if (!validBackgroundResult(output))
        return json(502, {
          error: 'The generator returned an incomplete background. Your current background is unchanged.',
        })
      json(200, output)
    } catch (error) {
      json(error instanceof HttpError ? error.status : 502, {
        error:
          error instanceof HttpError
            ? error.message
            : abort.signal.aborted
              ? 'Generation timed out. Your current background is unchanged.'
              : 'Generation could not finish. Your current background is unchanged; try again.',
      })
    } finally {
      clearTimeout(timeout)
    }
  }
}
