import type { IncomingMessage, ServerResponse } from 'node:http'
import { HttpError, jsonResponse, readBody, type Env } from './http.js'
import { validFancyRequest, validFancyResult } from '../src/fancy/contract.js'
import { generateText } from './textModel.js'
import { fancyPayload } from './fancyContract.js'

/** Shared handler for local development and Vercel; credentials stay request-scoped. */
export function createFancyHandler(env: Env) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const json = (status: number, body: unknown) => jsonResponse(res, status, body)
    if (req.method !== 'POST' || req.url !== '/') return json(404, { error: 'Not found' })
    if (
      req.headers.origin !== `http://${req.headers.host}` &&
      req.headers.origin !== `https://${req.headers.host}`
    )
      return json(403, { error: 'Use the Folio editor to style text.' })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 180000)
    res.on('close', () => {
      if (!res.writableEnded) controller.abort()
    })
    try {
      const body = await readBody(req, 200000)
      let request: unknown
      try {
        request = JSON.parse(body)
      } catch {
        return json(400, { error: 'Invalid text styling request.' })
      }
      if (!validFancyRequest(request))
        return json(400, { error: 'Use up to 20,000 characters of text and a 3,000-character instruction.' })
      const result: unknown = JSON.parse(await generateText(env, fancyPayload(request), controller.signal))
      if (!validFancyResult(result))
        return json(502, {
          error: 'The model returned an unsupported text style. Your previous style is unchanged.',
        })
      json(200, result)
    } catch (error) {
      json(error instanceof HttpError ? error.status : 502, {
        error: controller.signal.aborted
          ? 'Text styling timed out. Please retry.'
          : error instanceof SyntaxError
            ? 'The model returned an unreadable text style. Please retry.'
            : error instanceof Error
              ? error.message
              : 'Text styling could not finish. Please retry.',
      })
    } finally {
      clearTimeout(timeout)
    }
  }
}
