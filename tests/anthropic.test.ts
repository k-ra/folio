import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { apiHandler } from '../server/routes'
import { generateText } from '../server/textModel'
import {
  apiFetch,
  bindApiKeyOwner,
  disableAI,
  forgetApiKey,
  getAIProvider,
  hasApiKey,
  rememberApiKey,
  selectAIProvider,
} from '../src/ai/session'
import { readConnection } from '../src/ai/connection'
import { DEF_STYLE } from '../src/model/constants'

const anthropicKey = 'sk-ant-offline-visitor-key'

beforeEach(() => {
  localStorage.clear()
  bindApiKeyOwner('anthropic-a')
})
afterEach(() => {
  forgetApiKey()
  selectAIProvider('openai')
  bindApiKeyOwner(null)
  localStorage.clear()
  vi.unstubAllGlobals()
})

it('remembers provider-specific keys per account without uploading them or mixing sessions', async () => {
  rememberApiKey('sk-openai-offline-key')
  selectAIProvider('anthropic')
  expect(hasApiKey()).toBe(false)
  expect(rememberApiKey(anthropicKey)).toBe(true)
  expect(getAIProvider()).toBe('anthropic')
  const fetch = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetch)
  await apiFetch('/api/chat', { method: 'POST' })
  expect(fetch.mock.calls[0][1].headers.get('X-Folio-Provider')).toBe('anthropic')
  expect(fetch.mock.calls[0][1].headers.get('X-Folio-Api-Key')).toBe(anthropicKey)
  bindApiKeyOwner('anthropic-b')
  expect(hasApiKey()).toBe(false)
  expect(getAIProvider()).toBe('openai')
  bindApiKeyOwner('anthropic-a')
  expect(getAIProvider()).toBe('anthropic')
  expect(hasApiKey()).toBe(true)
  forgetApiKey()
  selectAIProvider('openai')
  expect(localStorage.getItem('folio.ai.device-key.v1:anthropic-a')).toBe('sk-openai-offline-key')
  disableAI()
})

it('reports Anthropic text support but not OpenAI image generation', async () => {
  selectAIProvider('anthropic')
  rememberApiKey(anthropicKey)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ byok: true, configured: false, images: false }) }))
  expect(await readConnection()).toMatchObject({ configured: true, images: false, provider: 'Claude' })
})

it('uses the Anthropic Messages API with image references and structured output', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"html":"<svg></svg>"}' }] }),
  })
  vi.stubGlobal('fetch', fetch)
  const result = await generateText(
    { ANTHROPIC_API_KEY: anthropicKey, FOLIO_TEXT_PROVIDER: 'anthropic' },
    {
      instructions: 'Make a graphic',
      input: [{ role: 'user', content: [
        { type: 'input_text', text: 'Use this reference' },
        { type: 'input_image', image_url: 'data:image/png;base64,aW1hZ2U=' },
      ] }],
      text: { format: { schema: { type: 'object', properties: { html: { type: 'string' } } } } },
    },
    new AbortController().signal,
  )
  expect(result).toContain('<svg>')
  expect(fetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages')
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${anthropicKey}`)
  const sent = JSON.parse(fetch.mock.calls[0][1].body)
  expect(sent.system).toBe('Make a graphic')
  expect(sent.messages[0].content[1].source).toEqual({ type: 'base64', media_type: 'image/png', data: 'aW1hZ2U=' })
  expect(sent.output_config.format.type).toBe('json_schema')
  expect(fetch.mock.calls[0][1].body).not.toContain(anthropicKey)
})

it('rejects incomplete or unauthorized Anthropic output without revealing the key', async () => {
  const env = { ANTHROPIC_API_KEY: anthropicKey, FOLIO_TEXT_PROVIDER: 'anthropic' }
  const payload = { instructions: 'Reply', input: [{ role: 'user', content: [{ type: 'input_text', text: 'Hi' }] }] }
  const fetch = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 401 })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ stop_reason: 'max_tokens', content: [{ type: 'text', text: 'partial' }] }) })
  vi.stubGlobal('fetch', fetch)
  await expect(generateText(env, payload, new AbortController().signal)).rejects.toThrow('rejected this API key')
  await expect(generateText(env, payload, new AbortController().signal)).rejects.toThrow('complete result')
})

async function hosted(path: string, key = anthropicKey, body: unknown = {}) {
  const req = Object.assign(Readable.from([JSON.stringify(body)]), {
    method: 'POST', url: path,
    headers: { host: 'folio.example', origin: 'https://folio.example', 'x-folio-provider': 'anthropic', 'x-folio-api-key': key },
  }) as IncomingMessage
  let status = 0
  let response = ''
  const res = {
    destroyed: false, writableEnded: false, on: vi.fn(),
    writeHead: vi.fn((code: number) => { status = code }),
    write: vi.fn((part: string) => { response += part }),
    end: vi.fn((part = '') => { response += part }),
  }
  await apiHandler({ OPENAI_API_KEY: 'sk-owner-must-not-be-used' }, '.', true)(req, res as unknown as ServerResponse)
  return { status, body: JSON.parse(response) }
}

it('keeps hosted provider selection request-scoped and blocks web research', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hello' }] }) })
  vi.stubGlobal('fetch', fetch)
  expect((await hosted('/api/chat', anthropicKey, { instruction: 'Hello', history: [], story: {} })).status).toBe(200)
  expect(fetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages')
  expect((await hosted('/api/chat', anthropicKey, {
    instruction: 'Search', history: [], story: {}, settings: { browsing: true, searchTopic: 'whales' },
  })).body.error).toContain('OpenAI API key')
  expect(fetch).toHaveBeenCalledTimes(1)
  expect((await hosted('/api/chat', 'sk-openai-wrong-provider')).status).toBe(400)
})

it('does not use an owner OpenAI key to generate an image for an Anthropic visitor', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const response = await hosted('/api/magic', anthropicKey, {
    mode: 'image', instruction: 'A quiet moon', history: [], attachments: [], style: DEF_STYLE,
  })
  expect(response.status).toBe(503)
  expect(response.body.error).toContain('OpenAI API key')
  expect(fetch).not.toHaveBeenCalled()
})
