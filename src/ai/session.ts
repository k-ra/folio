// Deliberately memory-only: never put credentials in stories, URLs or browser storage.
let apiKey = ''
let maxRequestBytes = 4_000_000
const listeners = new Set<() => void>()
export const hasApiKey = () => !!apiKey
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
  listeners.forEach((listener) => listener())
}
export function setRequestLimit(bytes: unknown) {
  if (typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0) maxRequestBytes = bytes
}
export async function apiFetch(
  path: '/api/magic' | '/api/chat' | '/api/background' | '/api/fancy',
  init: RequestInit,
) {
  if (typeof init.body === 'string' && new TextEncoder().encode(init.body).byteLength > maxRequestBytes)
    throw new Error(
      'This request is too large for this host. On Vercel, keep the complete request below 4 MB, including attachments and the previous artifact. Use a smaller data extract or image; the local server supports larger files.',
    )
  const headers = new Headers(init.headers)
  if (apiKey) headers.set('X-Folio-Api-Key', apiKey)
  return fetch(path, {
    ...init,
    headers,
    redirect: 'error',
    cache: 'no-store',
  })
}
