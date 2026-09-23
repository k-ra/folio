import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiFetch,
  bindApiKeyOwner,
  disableAI,
  forgetApiKey,
  hasApiKey,
  hasRememberedApiKey,
  isAIDisabled,
  rememberApiKey,
  resumeAI,
} from '../src/ai/session'

beforeEach(() => {
  localStorage.clear()
  bindApiKeyOwner('test-user-a')
})
afterEach(() => {
  forgetApiKey()
  bindApiKeyOwner(null)
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('remembered visitor API keys', () => {
  it('restores the current account key after a simulated reload and uses it for an explicit request', async () => {
    expect(rememberApiKey('sk-account-a-test-key')).toBe(true)
    bindApiKeyOwner('test-user-b')
    expect(hasApiKey()).toBe(false)
    bindApiKeyOwner('test-user-a')
    expect(hasApiKey()).toBe(true)
    const fetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetch)
    await apiFetch('/api/chat', { method: 'POST' })
    expect(fetch.mock.calls[0][1].headers.get('X-Folio-Api-Key')).toBe('sk-account-a-test-key')
  })

  it('keeps separate keys across signed-in accounts and the guest workspace', () => {
    rememberApiKey('sk-account-a-test-key')
    bindApiKeyOwner('test-user-b')
    expect(hasRememberedApiKey()).toBe(false)
    rememberApiKey('sk-account-b-test-key')
    bindApiKeyOwner(null)
    expect(hasApiKey()).toBe(false)
    rememberApiKey('sk-guest-test-key')
    bindApiKeyOwner('test-user-a')
    expect(hasApiKey()).toBe(true)
    expect(localStorage.getItem('folio.ai.device-key.v1:test-user-a')).toBe('sk-account-a-test-key')
    expect(localStorage.getItem('folio.ai.device-key.v1:test-user-b')).toBe('sk-account-b-test-key')
    expect(localStorage.getItem('folio.ai.device-key.v1:guest')).toBe('sk-guest-test-key')
  })

  it('No AI pauses a remembered key until re-enabled; Forget removes only this account key', () => {
    rememberApiKey('sk-account-a-test-key')
    disableAI()
    expect(hasApiKey()).toBe(false)
    expect(hasRememberedApiKey()).toBe(true)
    bindApiKeyOwner('test-user-b')
    bindApiKeyOwner('test-user-a')
    expect(isAIDisabled()).toBe(true)
    expect(resumeAI()).toBe(true)
    expect(hasApiKey()).toBe(true)
    forgetApiKey()
    expect(hasRememberedApiKey()).toBe(false)
    expect(hasApiKey()).toBe(false)
    bindApiKeyOwner('test-user-b')
    bindApiKeyOwner('test-user-a')
    expect(isAIDisabled()).toBe(true)
  })
})
