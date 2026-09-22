import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bindGoogleImport,
  clearGoogleImport,
  pendingGoogleImport,
  prepareGoogleImport,
} from '../src/cloud/googleImport'

describe('explicit Google import consent', () => {
  beforeEach(() => sessionStorage.clear())
  it('authentication alone never authorizes an upload', () => {
    expect(pendingGoogleImport('alice')).toBe(false)
    expect(bindGoogleImport('alice', 'unsolicited')).toBe(false)
    prepareGoogleImport(1000)
    expect(pendingGoogleImport('alice')).toBe(false)
  })
  it('binds a matching callback to one account and retains it for safe retries', () => {
    const nonce = prepareGoogleImport(1000)
    expect(bindGoogleImport('alice', 'wrong', 1100)).toBe(false)
    expect(bindGoogleImport('alice', nonce, 1100)).toBe(true)
    expect(pendingGoogleImport('alice')).toBe(true)
    expect(pendingGoogleImport('bob')).toBe(false)
    expect(bindGoogleImport('bob', nonce, 1200)).toBe(false)
    expect(pendingGoogleImport('alice')).toBe(true)
    clearGoogleImport()
    expect(pendingGoogleImport('alice')).toBe(false)
  })
  it('rejects expired, future and corrupted consent', () => {
    const nonce = prepareGoogleImport(1000)
    expect(bindGoogleImport('alice', nonce, 0)).toBe(false)
    expect(bindGoogleImport('alice', nonce, 1801001)).toBe(false)
    sessionStorage.setItem('folio.google-import-intent.v1', 'broken')
    expect(bindGoogleImport('alice', nonce, 1100)).toBe(false)
  })
  it('does not proceed if consent cannot be stored', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full')
    })
    expect(() => prepareGoogleImport()).toThrow('Full')
    spy.mockRestore()
    expect(pendingGoogleImport('alice')).toBe(false)
  })
})
