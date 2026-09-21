import { createContext, useContext, useState } from 'react'
import type { Story } from '../model/types'
import type { CloudState } from '../cloud/useCloud'
import { useAccount } from '../cloud/Auth'
import { cloudClient } from '../cloud/client'
import { backup, download, filename, readBackup, storyText } from './backup'
import { exportHtml, exportZip, externalDependencies } from './export'
import './info.css'

export const WorkspaceActions = createContext<{
  cloud?: CloudState
  importStory?: (s: Story) => void
  flush?: () => Promise<void>
}>({})
export default function InfoActions({ story }: { story?: Story }) {
  const { user } = useAccount(),
    { cloud, importStory, flush } = useContext(WorkspaceActions)
  const [email, setEmail] = useState(''),
    [token, setToken] = useState(''),
    [sent, setSent] = useState(false)
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notes, setNotes] = useState(false)
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
  return (
    <div className="info-actions">
      {story && (
        <div className="info-group">
          <button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const text = storyText(story)
                if (navigator.clipboard) await navigator.clipboard.writeText(text)
                else {
                  const el = document.createElement('textarea')
                  el.value = text
                  document.body.append(el)
                  el.select()
                  const ok = document.execCommand('copy')
                  el.remove()
                  if (!ok) throw new Error('Clipboard unavailable. Download HTML or a backup instead.')
                }
                setMessage('Entire story copied.')
              })
            }
          >
            Copy entire story
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                download(exportHtml(story, notes), 'text/html', filename(story) + '.html')
                setMessage(
                  externalDependencies(story).length
                    ? 'Downloaded. External references are listed inside the HTML and may be unavailable offline.'
                    : 'Downloaded a standalone HTML file; no external resources required.',
                )
              })
            }
          >
            Download HTML
          </button>
          <label>
            <input type="checkbox" checked={notes} onChange={(e) => setNotes(e.currentTarget.checked)} />{' '}
            Include margin notes in publication
          </label>
          <small>
            Chats and revision history are never included in HTML. For large media, download the ZIP and keep
            index.html with its assets folder.
          </small>
          <button
            disabled={busy}
            onClick={() =>
              void act(async () => {
                download(exportZip(story, notes) as BlobPart, 'application/zip', filename(story) + '.zip')
                setMessage('ZIP downloaded. External dependencies, if any, are listed in index.html.')
              })
            }
          >
            Download HTML + assets (.zip)
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void act(() => {
                download(backup(story), 'application/json', filename(story) + '.folio')
                setMessage(
                  'Backup downloaded, including notes, chats, media and history. Keep it private. External URLs remain references.',
                )
              })
            }
          >
            Download .folio backup
          </button>
        </div>
      )}
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
                      Your {cloud.browserCount} browser stories have not been automatically uploaded.
                      Importing copies them into this account; originals stay here. Existing cloud IDs are
                      skipped.
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
        )}
      </div>
      {busy && <small role="status">Working…</small>}
      {message && <small role="status">{message}</small>}
      {error && <small role="alert">{error}</small>}
    </div>
  )
}
