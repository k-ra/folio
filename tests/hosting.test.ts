import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiHandler } from '../server/routes'
import { HOSTED_REQUEST_BYTES, jsonResponse, readBody } from '../server/http'
import { DEF_STYLE } from '../src/model/constants'
import { DEFAULT_FANCY } from '../src/fancy/contract'
import { IMAGE_STUDIES } from '../src/model/imageStudies'

const key = 'sk-offline-visitor-key'
const owner = 'sk-offline-owner-key'
const base = { OPENAI_API_KEY: owner, FOLIO_TEXT_PROVIDER: 'claude', FOLIO_CLAUDE_CLI: '/must-not-run' }
afterEach(() => vi.unstubAllGlobals())
async function request(
  path: string,
  body: unknown = {},
  headers: Record<string, string> = {},
  parsed = false,
  method = 'POST',
) {
  const req = Object.assign(Readable.from(parsed ? [] : [JSON.stringify(body)]), {
    method,
    url: path,
    headers: { host: 'folio.example', origin: 'https://folio.example', 'x-folio-api-key': key, ...headers },
  }) as IncomingMessage
  if (parsed) Object.defineProperty(req, 'body', { get: () => body })
  let status = 0,
    output = ''
  const res = {
    destroyed: false,
    writableEnded: false,
    on: vi.fn(),
    writeHead: vi.fn((code: number) => {
      status = code
    }),
    write: vi.fn((chunk: string) => {
      output += chunk
    }),
    end: vi.fn((chunk = '') => {
      output += chunk
    }),
  }
  await apiHandler(base, '.', true)(req, res as unknown as ServerResponse)
  return { status, body: JSON.parse(output), res }
}

describe('hosted BYOK boundary', () => {
  it('reports BYOK without exposing or using deployment credentials', async () => {
    const result = await request('/api/magic/status', {}, {}, false, 'GET')
    expect(result.body).toEqual({
      configured: false,
      images: false,
      provider: null,
      byok: true,
      maxRequestBytes: HOSTED_REQUEST_BYTES,
    })
    expect(JSON.stringify(result)).not.toContain(owner)
    expect(JSON.stringify(result)).not.toContain(key)
  })
  it.each(['/api/magic', '/api/chat', '/api/fancy', '/api/background'])(
    'refuses missing keys before provider work on %s',
    async (path) => {
      const fetch = vi.fn()
      vi.stubGlobal('fetch', fetch)
      const req = Object.assign(Readable.from(['{}']), {
        method: 'POST',
        url: path,
        headers: { host: 'folio.example', origin: 'https://folio.example' },
      })
      const res = { destroyed: false, on: vi.fn(), writeHead: vi.fn(), end: vi.fn() }
      await apiHandler(base, '.', true)(req as IncomingMessage, res as unknown as ServerResponse)
      expect(res.writeHead).toHaveBeenCalledWith(401, expect.anything())
      expect(fetch).not.toHaveBeenCalled()
    },
  )
  it('rejects cross-origin and insecure hosted requests', async () => {
    expect((await request('/api/chat', {}, { origin: 'https://another.example' })).status).toBe(403)
    expect((await request('/api/chat', {}, { origin: 'http://folio.example' })).status).toBe(403)
  })
  it('rejects malformed keys and unknown routes', async () => {
    expect((await request('/api/chat', {}, { 'x-folio-api-key': 'invalid' })).status).toBe(400)
    expect((await request('/api/unknown')).status).toBe(404)
    expect((await request('/api/chat', {}, {}, false, 'GET')).status).toBe(404)
  })
  it('uses each visitor key independently, including simultaneous requests', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'A reply' }] }] }),
      })
    vi.stubGlobal('fetch', fetch)
    const body = { instruction: 'Discuss this', history: [], story: { title: 'Test' } }
    const results = await Promise.all([
      request('/api/chat', body),
      request('/api/chat', body, { 'x-folio-api-key': 'sk-offline-second-key' }, true),
    ])
    expect(results.map((r) => r.status)).toEqual([200, 200])
    expect(fetch.mock.calls.map((c) => c[1].headers.Authorization).sort()).toEqual(
      [`Bearer ${key}`, 'Bearer sk-offline-second-key'].sort(),
    )
    for (const call of fetch.mock.calls) {
      expect(call[0]).toBe('https://api.openai.com/v1/responses')
      expect(call[1].body).not.toContain('sk-offline')
      expect(JSON.parse(call[1].body).store).toBe(false)
    }
  })
  it('bundles the allowlisted style pixels into hosted image requests', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ output: [{ type: 'image_generation_call', result: 'aW1hZ2U=' }] }),
      })
    vi.stubGlobal('fetch', fetch)
    const result = await request(
      '/api/magic',
      {
        mode: 'image',
        instruction: 'An octopus',
        originalPrompt: 'An octopus',
        history: [],
        attachments: [],
        style: {
          ...DEF_STYLE,
          imageStyle: IMAGE_STUDIES[0].treatment,
          imageDirection: IMAGE_STUDIES[0].direction,
        },
      },
      {},
      true,
    )
    expect(result.status).toBe(200)
    expect(result.body.src).toBe('data:image/png;base64,aW1hZ2U=')
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${key}`)
    expect(JSON.parse(fetch.mock.calls[0][1].body).input[0].content[2].image_url).toMatch(
      /^data:image\/webp;base64,/,
    )
  })
  it.each([
    [
      '/api/magic',
      {
        mode: 'graphics',
        instruction: 'Draw a circle',
        originalPrompt: '',
        history: [],
        attachments: [],
        style: DEF_STYLE,
      },
      { html: '<svg></svg>', caption: 'Circle', reply: 'Drawn.' },
    ],
    [
      '/api/background',
      { prompt: 'Soft blue', background: '#ffffff', ink: '#000000', previous: '' },
      { css: 'body{background:#ddddff}' },
    ],
    [
      '/api/fancy',
      {
        text: 'My words',
        instruction: 'A little bigger',
        previous: DEFAULT_FANCY,
        history: [],
        style: DEF_STYLE,
      },
      { fancy: DEFAULT_FANCY, reply: 'Kept your words.' },
    ],
  ] as const)('serves %s with the same visitor connection', async (path, body, output) => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }],
        }),
      })
    vi.stubGlobal('fetch', fetch)
    expect((await request(path, body, {}, true)).status).toBe(200)
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${key}`)
  })
  it('enforces the byte limit before provider calls for streams and parsed bodies', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    for (const parsed of [true, false]) {
      expect((await request('/api/magic', 'é'.repeat(HOSTED_REQUEST_BYTES / 2 + 1), {}, parsed)).status).toBe(
        413,
      )
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects invalid JSON from the Vercel body helper without leaking it', async () => {
    const req = Object.assign(Readable.from([]), {
      method: 'POST',
      url: '/api/magic',
      headers: { host: 'folio.example', origin: 'https://folio.example', 'x-folio-api-key': key },
    })
    Object.defineProperty(req, 'body', {
      get: () => {
        throw new SyntaxError('sensitive input')
      },
    })
    const res = { destroyed: false, on: vi.fn(), writeHead: vi.fn(), end: vi.fn() }
    await apiHandler(base, '.', true)(req as IncomingMessage, res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(400, expect.anything())
    expect(res.end.mock.calls[0][0]).not.toContain('sensitive input')
  })
  it('streams a response larger than Vercel’s buffered response limit intact', () => {
    const chunks: Buffer[] = []
    const res = {
      destroyed: false,
      writeHead: vi.fn(),
      write: (chunk: Buffer) => chunks.push(chunk),
      end: vi.fn(),
    }
    const body = { src: '🌿'.repeat(1_500_000) }
    jsonResponse(res as unknown as ServerResponse, 200, body)
    expect(chunks.length).toBeGreaterThan(1)
    expect(JSON.parse(Buffer.concat(chunks).toString('utf8'))).toEqual(body)
    expect(res.end).toHaveBeenCalledWith()
  })
  it('keeps local large attachment support', async () => {
    const text = 'a'.repeat(5_000_000)
    const req = Object.assign(Readable.from([text]), { headers: {} })
    expect(await readBody(req as IncomingMessage, 64 * 1024 * 1024)).toBe(text)
  })
})
