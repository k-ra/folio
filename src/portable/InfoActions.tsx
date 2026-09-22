import { createContext, useContext, useState } from 'react'
import type { Story } from '../model/types'
import type { CloudState } from '../cloud/useCloud'
import { useAccount } from '../cloud/Auth'
import { cloudClient } from '../cloud/client'
import { prepareGoogleImport, clearGoogleImport } from '../cloud/googleImport'
import { readBackup } from './backup'
import StoryDownloads from './StoryDownloads'
import './info.css'

export const WorkspaceActions = createContext<{
  cloud?: CloudState
  importStory?: (s: Story) => void
  flush?: () => Promise<void>
}>({})
export default function InfoActions({ story }: { story?: Story }) {
  const { user, error: authError } = useAccount(),
    { cloud, importStory, flush } = useContext(WorkspaceActions)
  const [email, setEmail] = useState(''),
    [token, setToken] = useState(''),
    [sent, setSent] = useState(false)
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const act = async (fn: () => Promise<void> | void) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish. Your story is unchanged.')
    } finally {
      setBusy(false)
    }
  }
  if (story) return <StoryDownloads story={story} />
  return (
    <div className="info-actions">
      {importStory && (
        <label className="info-import">
          Import .folio backup
          <input
            type="file"
            accept=".folio,application/json"
            disabled={busy}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0]
              e.currentTarget.value = ''
              if (file)
                void act(async () => {
                  if (file.size > 200 * 1024 * 1024) throw new Error('Backup exceeds the 200 MB limit.')
                  importStory(readBackup(await file.text()))
                  setMessage('Backup imported. Existing stories are unchanged.')
                })
            }}
          />
        </label>
      )}
      <div className="info-group">
        <span className="eyebrow">ACCOUNT</span>
        {!cloudClient ? (
          <small>
            Cloud accounts are not configured on this installation. Local saving and exports work without an
            account.
          </small>
        ) : user ? (
          <>
            <span>{user.email}</span>
            <button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await flush?.()
                  const { error } = await cloudClient!.auth.signOut()
                  if (error) throw error
                })
              }
            >
              Sign out
            </button>
            {cloud && (
              <>
                <small>{cloud.status}. Cloud saving includes private notes, media, chats and history.</small>
                {!!cloud.browserCount && (
                  <>
                    <small>
                      {cloud.browserCount} browser originals remain on this device. Import copies missing
                      stories into this account; existing cloud IDs are skipped.
                    </small>
                    <button disabled={busy} onClick={() => void act(cloud.importBrowser)}>
                      Import browser stories to my account
                    </button>
                  </>
                )}
                {cloud.importMessage && <small role="status">{cloud.importMessage}</small>}
                {cloud.error && (
                  <div role="alert">
                    {cloud.error} Your local copy is retained.{' '}
                    <button onClick={cloud.retry}>Retry cloud save</button>
                  </div>
                )}
                {cloud.conflicts.map((c) => (
                  <div key={c.id} role="alert">
                    “{c.remote.story?.title || 'Story'}” changed on another device. Nothing was overwritten.
                    <button disabled={busy} onClick={() => void act(() => cloud.keepBoth(c))}>
                      Keep both copies
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            {import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true' && (
              <button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await flush?.()
                    const nonce = prepareGoogleImport()
                    try {
                      const redirect = new URL(import.meta.env.BASE_URL, location.origin)
                      redirect.searchParams.set('folio_import', nonce)
                      const { error } = await cloudClient!.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: redirect.href },
                      })
                      if (error) throw error
                    } catch (e) {
                      clearGoogleImport()
                      throw e
                    }
                  })
                }
              >
                Sign in with Google &amp; import browser stories
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void act(async () => {
                  await flush?.()
                  const { error } = sent
                    ? await cloudClient!.auth.verifyOtp({
                        email,
                        token,
                        type: 'email',
                      })
                    : await cloudClient!.auth.signInWithOtp({ email })
                  if (error) throw error
                  if (!sent) {
                    setSent(true)
                    setMessage('Check your email for a sign-in code.')
                  }
                })
              }}
            >
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  disabled={sent}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
              </label>
              {sent && (
                <label>
                  Sign-in code
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    required
                    value={token}
                    onChange={(e) => setToken(e.currentTarget.value)}
                  />
                </label>
              )}
              <button disabled={busy}>{sent ? 'Confirm sign-in' : 'Email me a sign-in code'}</button>
              {sent && (
                <button
                  type="button"
                  onClick={() => {
                    setSent(false)
                    setToken('')
                  }}
                >
                  Use another email / resend
                </button>
              )}
              <small>
                Signing in opens your private cloud library. Browser stories are not uploaded unless you
                explicitly import them.
              </small>
            </form>
          </>
        )}
      </div>
      {busy && <small role="status">Working…</small>}
      {message && <small role="status">{message}</small>}
      {error && <small role="alert">{error}</small>}
      {authError && <small role="alert">{authError}</small>}
    </div>
  )
}
