const KEY = 'folio.google-import-intent.v1'
const MAX_AGE = 30 * 60 * 1000
type Intent = { nonce: string; created: number; owner?: string }
const read = (): Intent | null => {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    return value && typeof value.nonce === 'string' && typeof value.created === 'number' ? value : null
  } catch {
    return null
  }
}
/** The labeled sign-in-and-import action is consent; authentication alone is not. */
export function prepareGoogleImport(now = Date.now()) {
  const nonce = crypto.randomUUID()
  sessionStorage.setItem(KEY, JSON.stringify({ nonce, created: now }))
  return nonce
}
export function bindGoogleImport(owner: string, nonce: string | null, now = Date.now()) {
  const intent = read()
  if (
    !intent ||
    !nonce ||
    nonce !== intent.nonce ||
    intent.owner ||
    now - intent.created > MAX_AGE ||
    now < intent.created
  )
    return false
  sessionStorage.setItem(KEY, JSON.stringify({ ...intent, owner }))
  return true
}
export const pendingGoogleImport = (owner: string) => read()?.owner === owner
export function clearGoogleImport() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* No consent remains readable. */
  }
}
