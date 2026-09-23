// BYOK credentials are never part of stories, backups, cloud records, or URLs.
// A visitor can explicitly remember a key on this device. Browser storage is not a vault.
let apiKey = ''
let disabled = false
let owner: string | null = null
const keyFor = (id: string) => `folio.ai.device-key.v1:${id}`
const offFor = (id: string) => `folio.ai.off.v1:${id}`
function storage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}
function notifyKey() { listeners.forEach((listener) => listener()) }
export function bindApiKeyOwner(id: string | null) {
  const next = id || 'guest'
  if (owner === next) return
  owner = next
  const store = storage()
  try {
    disabled = store?.getItem(offFor(next)) === '1'
    apiKey = disabled ? '' : store?.getItem(keyFor(next)) || ''
  } catch { disabled = false; apiKey = '' }
  keyRevision++
  updateRequestState('ready')
  notifyKey()
}
export function hasRememberedApiKey() {
  if (!owner) return false
  try { return !!storage()?.getItem(keyFor(owner)) } catch { return false }
}
export function rememberApiKey(value: string): boolean {
  setApiKey(value)
  if (!owner) return false
  try {
    const store = storage()
    if (!store) return false
    store.setItem(keyFor(owner), value.trim())
    store.removeItem(offFor(owner))
    notifyKey()
    return true
  } catch { return false }
}
export function resumeAI() {
  if (!owner || !hasRememberedApiKey()) return false
  try {
    const key = storage()?.getItem(keyFor(owner)) || ''
    setApiKey(key)
    storage()?.removeItem(offFor(owner))
    return true
  } catch { return false }
}
export function forgetApiKey() {
  if (owner) {
    try {
      storage()?.removeItem(keyFor(owner))
      storage()?.setItem(offFor(owner), '1')
    } catch { /* Keep the in-memory disconnect. */ }
  }
  apiKey = ''
  disabled = true
  keyRevision++
  updateRequestState('ready')
  notifyKey()
}
let maxRequestBytes = 4_000_000
let requestState: 'ready' | 'connected' | 'error' = 'ready'
let keyRevision = 0
const requestListeners = new Set<() => void>()
export const getAIRequestState = () => requestState
export const subscribeAIRequestState = (listener: () => void) => {
  requestListeners.add(listener)
  return () => {
    requestListeners.delete(listener)
  }
}
function updateRequestState(state: typeof requestState) {
  requestState = state
  requestListeners.forEach((listener) => listener())
}
const listeners = new Set<() => void>()
export const hasApiKey = () => !!apiKey
export const isAIDisabled = () => disabled
export function disableAI() {
  apiKey = ''
  disabled = true
  if (owner) {
    try { storage()?.setItem(offFor(owner), '1') } catch { /* Memory-only fallback. */ }
  }
  keyRevision++
  updateRequestState('ready')
  notifyKey()
}
export const subscribeKey = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function setApiKey(value: string) {
  const key = value.trim()
  if (key && !/^sk-[\w-]{10,500}$/.test(key)) throw new Error('Enter an OpenAI API key beginning with sk-.')
  apiKey = key
  disabled = false
  keyRevision++
  updateRequestState('ready')
  notifyKey()
}
export function setRequestLimit(bytes: unknown) {
  if (typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0) maxRequestBytes = bytes
}
export async function apiFetch(
  path: '/api/magic' | '/api/chat' | '/api/background' | '/api/fancy' | '/api/style',
  init: RequestInit,
) {
  if (disabled) throw new Error('AI is off. Choose AI in settings to connect a key.')
  if (typeof init.body === 'string' && new TextEncoder().encode(init.body).byteLength > maxRequestBytes)
    throw new Error(
      'This request is too large for this host. On Vercel, keep the complete request below 4 MB, including attachments and the previous artifact. Use a smaller data extract or image; the local server supports larger files.',
    )
  const headers = new Headers(init.headers)
  if (apiKey) headers.set('X-Folio-Api-Key', apiKey)
  const revision = keyRevision
  try {
    const response = await fetch(path, {
      ...init,
      headers,
      redirect: 'error',
      cache: 'no-store',
    })
    if (revision === keyRevision) updateRequestState(response.ok ? 'connected' : 'error')
    return response
  } catch (cause) {
    if (
      revision === keyRevision &&
      !init.signal?.aborted &&
      !(typeof cause === 'object' && cause !== null && 'name' in cause && cause.name === 'AbortError')
    )
      updateRequestState('error')
    throw cause
  }
}
