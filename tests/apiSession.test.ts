import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, hasApiKey, setApiKey, setRequestLimit } from '../src/ai/session'

afterEach(() => {
  setApiKey('')
  setRequestLimit(4_000_000)
  vi.unstubAllGlobals()
})
describe('tab-only API connection', () => {
  it('sends the key only as a header, prevents redirect leakage, and forgets on disconnect', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetch)
    setApiKey('sk-offline-visitor-key')
    expect(hasApiKey()).toBe(true)
    await apiFetch('/api/chat', { method: 'POST', body: '{}' })
    expect(fetch.mock.calls[0][1].headers.get('X-Folio-Api-Key')).toBe('sk-offline-visitor-key')
    expect(fetch.mock.calls[0][1].redirect).toBe('error')
    expect(fetch.mock.calls[0][1].body).toBe('{}')
    expect(JSON.stringify(localStorage)).not.toContain('sk-offline')
    expect(JSON.stringify(sessionStorage)).not.toContain('sk-offline')
    setApiKey('')
    await apiFetch('/api/chat', { method: 'POST', body: '{}' })
    expect(fetch.mock.calls[1][1].headers.has('X-Folio-Api-Key')).toBe(false)
    expect(hasApiKey()).toBe(false)
  })
  it('catches oversized UTF-8 requests before uploading', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    setRequestLimit(100)
    await expect(apiFetch('/api/magic', { method: 'POST', body: 'é'.repeat(51) })).rejects.toThrow(
      'too large',
    )
    expect(fetch).not.toHaveBeenCalled()
  })
  it('does not accept malformed keys', () => {
    expect(() => setApiKey('not a key')).toThrow('OpenAI')
    expect(hasApiKey()).toBe(false)
  })
})
