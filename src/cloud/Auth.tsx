import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { cloudClient } from './client'

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
const Context = createContext<{ user: Identity | null; ready: boolean }>({
  user: null,
  ready: true,
})
export const useAccount = () => useContext(Context)
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Identity | null>(() => (cloudClient ? cachedIdentity() : null))
  const [ready, setReady] = useState(!cloudClient || !!user)
  useEffect(() => {
    if (!cloudClient) return
    const timeout = setTimeout(() => setReady(true), 1500)
    const { data } = cloudClient.auth.onAuthStateChange((_event, session) => {
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
  return <Context.Provider value={{ user, ready }}>{children}</Context.Provider>
}
