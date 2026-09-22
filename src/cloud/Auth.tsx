import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { cloudClient } from './client'
import { bindGoogleImport, clearGoogleImport, pendingGoogleImport } from './googleImport'

type Identity = Pick<User, 'id' | 'email'>
const IDENTITY = 'folio.account.identity'
function cachedIdentity(): Identity | null {
  // UI/cache routing only, NEVER authorization. Supabase verifies every remote request.
  try {
    const value = JSON.parse(localStorage.getItem(IDENTITY) || 'null')
    return value && /^[\da-f-]{36}$/i.test(value.id) && typeof value.email === 'string'
      ? { id: value.id, email: value.email }
      : null
  } catch {
    return null
  }
}
const Context = createContext<{
  user: Identity | null
  ready: boolean
  error?: string
}>({
  user: null,
  ready: true,
})
export const useAccount = () => useContext(Context)
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Identity | null>(() => (cloudClient ? cachedIdentity() : null))
  const [ready, setReady] = useState(!cloudClient || !!user)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!cloudClient) return
    const callback = new URL(location.href)
    const nonce = callback.searchParams.get('folio_import')
    const denied =
      callback.searchParams.has('error') || new URLSearchParams(callback.hash.slice(1)).has('error')
    if (denied) {
      clearGoogleImport()
      setError('Google sign-in did not finish. Your browser stories are unchanged.')
    }
    const timeout = setTimeout(() => setReady(true), 1500)
    const { data } = cloudClient.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_OUT') clearGoogleImport()
      if (session?.user && nonce && !denied) {
        try {
          if (!bindGoogleImport(session.user.id, nonce) && !pendingGoogleImport(session.user.id))
            setError(
              'Signed in. The import request expired; use Import browser stories in Account. Originals are unchanged.',
            )
          const clean = new URL(location.href)
          clean.searchParams.delete('folio_import')
          history.replaceState(history.state, '', clean)
        } catch {
          setError(
            'Signed in, but automatic import could not start. Use Import browser stories in Account. Originals are unchanged.',
          )
        }
      }
      if (_event === 'INITIAL_SESSION' && !session && !navigator.onLine && cachedIdentity()) {
        setReady(true)
        return
      }
      setUser(session?.user || null)
      setReady(true)
      try {
        if (session?.user)
          localStorage.setItem(IDENTITY, JSON.stringify({ id: session.user.id, email: session.user.email }))
        else localStorage.removeItem(IDENTITY)
      } catch {
        /* Account routing remains in memory when local storage is unavailable. */
      }
    })
    return () => {
      clearTimeout(timeout)
      data.subscription.unsubscribe()
    }
  }, [])
  return <Context.Provider value={{ user, ready, error }}>{children}</Context.Provider>
}
