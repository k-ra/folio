import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import status from '../api/magic/status'
import magic from '../api/magic'
import chat from '../api/chat'
import background from '../api/background'
import fancy from '../api/fancy'
import style from '../api/style'

describe('Vercel file routes', () => {
  it.each([
    ['/api/magic/status', status, 'GET', 200],
    ['/api/magic', magic, 'POST', 401],
    ['/api/chat', chat, 'POST', 401],
    ['/api/background', background, 'POST', 401],
    ['/api/fancy', fancy, 'POST', 401],
    ['/api/style', style, 'POST', 401],
  ] as const)('%s reaches the shared BYOK handler', async (path, handler, method, expected) => {
    const req = Object.assign(Readable.from(['{}']), {
      method,
      url: path,
      headers: { host: 'folio.example', origin: 'https://folio.example' },
    }) as IncomingMessage
    const res = {
      destroyed: false,
      writableEnded: false,
      writeHead: vi.fn(),
      end: vi.fn(),
    }
    await handler(req, res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(expected, expect.anything())
    if (path === '/api/magic/status')
      expect(JSON.parse(res.end.mock.calls[0][0])).toMatchObject({ byok: true, configured: false })
  })
})
