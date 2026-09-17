import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: vi.fn(), configurable: true })
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
