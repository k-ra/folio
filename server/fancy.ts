import { loadEnv, type Plugin } from 'vite'
import { validFancyRequest, validFancyResult } from '../src/fancy/contract'
import { generateText } from './textModel'
import { fancyPayload } from './fancyContract'

/** Local-only: uses the same model connection as artifact editing, never a keyword simulation. */
export function fancyApi(): Plugin {
  return {
    name: 'folio-fancy-api',
    configureServer(server) {
      const env = { ...loadEnv(server.config.mode, server.config.root, ''), ...process.env }
      server.middlewares.use('/api/fancy', async (req, res) => {
        const json = (status: number, body: unknown) => {
          if (res.destroyed) return
          res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify(body))
        }
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
          let body = ''
          req.setEncoding('utf8')
          for await (const chunk of req) {
            body += chunk
            if (Buffer.byteLength(body) > 200000)
              return json(413, { error: 'This text styling request is too large.' })
          }
          let request: unknown
          try {
            request = JSON.parse(body)
          } catch {
            return json(400, { error: 'Invalid text styling request.' })
          }
          if (!validFancyRequest(request))
            return json(400, {
              error: 'Use up to 20,000 characters of text and a 3,000-character instruction.',
            })
          const result: unknown = JSON.parse(
            await generateText(env, fancyPayload(request), controller.signal),
          )
          if (!validFancyResult(result))
            return json(502, {
              error: 'The model returned an unsupported text style. Your previous style is unchanged.',
            })
          json(200, result)
        } catch (error) {
          json(502, {
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
      })
    },
  }
}
