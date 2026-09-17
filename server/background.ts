import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin } from 'vite'
import { validBackgroundResult } from '../src/style/backgrounds'
import { backgroundPayload, validBackgroundRequest } from './backgroundContract'
import { connectionStatus, generateText } from './textModel'

/** Development-only companion to the artifact bridge; the existing server key/model stay server-side. */
export function backgroundApi(): Plugin {
  return {
    name: 'folio-background-api',
    configureServer(server) {
      const env = {
        ...loadEnv(server.config.mode, server.config.root, ''),
        ...process.env,
      }
      server.middlewares.use('/api/background', async (req: IncomingMessage, res: ServerResponse) => {
        const json = (status: number, value: unknown) => {
          if (!res.destroyed) {
            res.writeHead(status, {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            })
            res.end(JSON.stringify(value))
          }
        }
        if (req.method !== 'POST' || req.url !== '/') return json(404, { error: 'Not found' })
        if (
          req.headers.origin !== `http://${req.headers.host}` &&
          req.headers.origin !== `https://${req.headers.host}`
        )
          return json(403, {
            error: 'Use the Folio editor to generate a background.',
          })
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
          let body = ''
          req.setEncoding('utf8')
          for await (const chunk of req) {
            body += chunk.toString()
            if (body.length > 160000) return json(413, { error: 'Background request is too large.' })
          }
          let request: unknown
          try {
            request = JSON.parse(body)
          } catch {
            return json(400, { error: 'The background request is invalid.' })
          }
          if (!validBackgroundRequest(request))
            return json(400, { error: 'The background request is invalid.' })
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
        } catch {
          json(502, {
            error: abort.signal.aborted
              ? 'Generation timed out. Your current background is unchanged.'
              : 'Generation could not finish. Your current background is unchanged; try again.',
          })
        } finally {
          clearTimeout(timeout)
        }
      })
    },
  }
}
