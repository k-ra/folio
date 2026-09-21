import { afterEach, expect, it, vi } from 'vitest'
import { apiFetch, disableAI, hasApiKey, isAIDisabled, setApiKey } from '../src/ai/session'
import { readConnection } from '../src/ai/connection'

afterEach(() => { setApiKey(''); vi.unstubAllGlobals() })
it('No AI clears the key and blocks future requests even on a preconfigured local server', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ byok: true, configured: true, images: true }) })
  vi.stubGlobal('fetch', fetch)
  setApiKey('sk-offline-test-key')
  disableAI()
  expect(hasApiKey()).toBe(false)
  expect(await readConnection()).toMatchObject({ configured: false, images: false })
  fetch.mockClear()
  await expect(apiFetch('/api/chat', { method: 'POST' })).rejects.toThrow('AI is off')
  expect(fetch).not.toHaveBeenCalled()
  setApiKey('sk-new-offline-key')
  expect(isAIDisabled()).toBe(false)
  expect(await readConnection()).toMatchObject({ configured: true })
})
