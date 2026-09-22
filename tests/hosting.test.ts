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
  it('isolates public web research from private story context and custom prompts', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: [
            {
              content: [
                {
                  type: 'output_text',
                  text: 'Research [source]',
                  annotations: [
                    {
                      type: 'url_citation',
                      start_index: 9,
                      end_index: 17,
                      url: 'https://example.org/research',
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'A grounded reply.' }] }] }),
      })
    vi.stubGlobal('fetch', fetch)
    const result = await request('/api/chat', {
      instruction: 'PRIVATE MESSAGE',
      history: [{ me: true, text: 'PRIVATE HISTORY' }],
      story: {
        title: 'PRIVATE TITLE',
        notes: { a: 'PRIVATE NOTE' },
        blocks: [{ attachments: ['PRIVATE DATA'] }],
      },
      settings: {
        browsing: true,
        searchTopic: 'whale communication research',
        systemPrompt: 'PRIVATE CUSTOM PROMPT',
      },
    })
    expect(result.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
    const search = JSON.parse(fetch.mock.calls[0][1].body)
    expect(search.tools).toEqual([{ type: 'web_search', search_context_size: 'low' }])
    expect(search.max_tool_calls).toBe(3)
    expect(search.max_output_tokens).toBe(8000)
    expect(search.input[0].content[0].text).toBe('whale communication research')
    expect(JSON.stringify(search)).not.toContain('PRIVATE')
    const reply = JSON.parse(fetch.mock.calls[1][1].body)
    expect(reply.tools).toBeUndefined()
    expect(reply.instructions).toContain('PRIVATE CUSTOM PROMPT')
    expect(reply.instructions).toContain('untrusted reference material')
    expect(JSON.stringify(reply.input)).toContain('PRIVATE NOTE')
    expect(JSON.stringify(reply.input)).toContain('https://example.org/research')
    expect(result.body.reply).toContain('[1](<https://example.org/research>)')
  })
  it('rejects malformed browsing preferences before making model calls', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    for (const settings of [
      { browsing: true },
      { browsing: 'yes' },
      { systemPrompt: 'x'.repeat(6001) },
      { browsing: true, searchTopic: 'x'.repeat(501) },
      { tools: ['shell'] },
    ]) {
      const result = await request('/api/chat', { instruction: 'Hello', history: [], story: {}, settings })
      expect(result.status).toBe(400)
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('surfaces research failure without inventing a fallback reply', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    vi.stubGlobal('fetch', fetch)
    const result = await request('/api/chat', {
      instruction: 'Hello',
      history: [],
      story: {},
      settings: { browsing: true, searchTopic: 'whales' },
    })
    expect(result.status).toBe(502)
    expect(result.body.error).toContain('limit')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
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
  it.each(['/api/magic', '/api/chat', '/api/fancy', '/api/background', '/api/style'])(
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
    const fetch = vi.fn().mockResolvedValue({
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
    const fetch = vi.fn().mockResolvedValue({
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
      '/api/style',
      {
        category: 'data',
        instruction: 'A radial field',
        history: [],
        current: { direction: '', background: '#ffffff', ink: '#111111', css: '' },
      },
      {
        name: 'Radial field',
        direction: 'Radial marks with hover details.',
        reply: 'A radial study.',
        background: '#ffffff',
        ink: '#111111',
        css: '',
        sample: '<svg></svg>',
      },
    ],
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
    const fetch = vi.fn().mockResolvedValue({
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
