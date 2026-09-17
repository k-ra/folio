import type { IncomingMessage, ServerResponse } from 'node:http'
import { createMagicHandler } from './magic.js'
import { createBackgroundHandler } from './background.js'
import { createChatHandler } from './chat.js'
import { createFancyHandler } from './fancy.js'
import { connectionStatus } from './textModel.js'
import { HOSTED_REQUEST_BYTES, HttpError, jsonResponse, readBody, requestEnv, type Env } from './http.js'

/** One router for both transports. It never logs headers, prompts or credentials. */
export function apiHandler(base: Env, root: string, hosted = false) {
  return async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    const path = (req.url || '').split('?')[0].replace(/\/$/, '')
    if (req.method === 'GET' && path === '/api/magic/status') {
      return jsonResponse(res, 200, {
        ...connectionStatus(hosted ? {} : base),
        byok: true,
        maxRequestBytes: hosted ? HOSTED_REQUEST_BYTES : 64 * 1024 * 1024,
      })
    }
    if (req.method !== 'POST' || !['/api/magic', '/api/chat', '/api/background', '/api/fancy'].includes(path))
      return jsonResponse(res, 404, { error: 'Not found' })
    const sameOrigin =
      req.headers.origin === `https://${req.headers.host}` ||
      (!hosted && req.headers.origin === `http://${req.headers.host}`)
    if (!req.headers.host || !sameOrigin)
      return jsonResponse(res, 403, {
        error: 'Use the Folio editor on this site.',
      })
    try {
      const env = requestEnv(req, base, hosted)
      if (!connectionStatus(env).configured)
        return jsonResponse(res, 401, {
          error: 'Connect your own OpenAI API key in AI settings first.',
        })
      if (hosted) await readBody(req, HOSTED_REQUEST_BYTES)
      const handler =
        path === '/api/magic'
          ? createMagicHandler(env, root)
          : path === '/api/chat'
            ? createChatHandler(env)
            : path === '/api/background'
              ? createBackgroundHandler(env)
              : createFancyHandler(env)
      const originalUrl = req.url
      req.url = '/'
      try {
        await handler(req, res)
      } finally {
        req.url = originalUrl
      }
    } catch (error) {
      jsonResponse(res, error instanceof HttpError ? error.status : 400, {
        error: error instanceof HttpError ? error.message : 'The request could not be read. Please retry.',
      })
    }
  }
}
