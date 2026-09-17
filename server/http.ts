import type { IncomingMessage, ServerResponse } from 'node:http'

export type Env = Record<string, string | undefined>
export const HOSTED_REQUEST_BYTES = 4_000_000
const requestBodies = new WeakMap<IncomingMessage, string>()

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Vercel may supply a parsed body; Vite supplies a stream. Apply the same byte limit to both. */
export async function readBody(req: IncomingMessage & { body?: unknown }, limit: number) {
  const oversized = () =>
    new HttpError(413, 'This request is too large. Use a smaller attachment or data extract.')
  if (Number(req.headers['content-length']) > limit) throw oversized()
  const cached = requestBodies.get(req)
  if (cached !== undefined) {
    if (Buffer.byteLength(cached) > limit) throw oversized()
    return cached
  }
  if ('body' in req && req.body !== undefined) {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (Buffer.byteLength(body) > limit) throw oversized()
    requestBodies.set(req, body)
    return body
  }
  let body = '',
    bytes = 0
  req.setEncoding('utf8')
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk)
    if (bytes > limit) throw oversized()
    body += chunk
  }
  requestBodies.set(req, body)
  return body
}

export function jsonResponse(res: ServerResponse, status: number, value: unknown) {
  if (res.destroyed || res.writableEnded) return
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  const body = JSON.stringify(value)
  // Stream large image JSON instead of Vercel's size-limited buffered response.
  if (Buffer.byteLength(body) > 3_000_000) {
    const bytes = Buffer.from(body)
    for (let i = 0; i < bytes.length; i += 64 * 1024) res.write(bytes.subarray(i, i + 64 * 1024))
    res.end()
  } else res.end(body)
}

export function requestEnv(req: IncomingMessage, base: Env, hosted: boolean): Env {
  const key = req.headers['x-folio-api-key']
  if (key !== undefined && (typeof key !== 'string' || !/^sk-[\w-]{10,500}$/.test(key)))
    throw new HttpError(400, 'Enter a valid OpenAI API key in AI settings.')
  if (hosted || key) {
    // Never fall back to a deployment owner's key or local subscription for visitors.
    return {
      OPENAI_API_KEY: key as string | undefined,
      FOLIO_TEXT_PROVIDER: 'openai',
      FOLIO_TEXT_MODEL: base.FOLIO_TEXT_MODEL,
      FOLIO_IMAGE_MODEL: base.FOLIO_IMAGE_MODEL,
    }
  }
  return base
}
