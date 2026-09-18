import { useId, useRef, useState } from 'react'
import { useConnection } from './connection'
import { hasApiKey, setApiKey } from './session'
import './connection.css'

/** The homepage shows the field directly; story controls share the same form in a dialog. */
export default function AIConnection({ inline = false }: { inline?: boolean }) {
  const connection = useConnection()
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  if (!connection?.byok)
    return inline ? (
      <p className="ai-inline-help">
        {connection
          ? 'AI is unavailable on this host. Run Folio with its API server to connect a key.'
          : 'Checking AI connection…'}
      </p>
    ) : null
  const close = () => {
    setDraft('')
    setError('')
    dialog.current?.close()
  }
  const disclosure =
    'When you ask for AI help, this site’s server forwards your key and the relevant writing, instructions and attachments to OpenAI. Only use a deployment you trust. API charges apply; connecting alone makes no model request.'
  const form = (
    <form
      className={inline ? 'ai-connection-inline' : undefined}
      aria-label="AI connection"
      onSubmit={(e) => {
        e.preventDefault()
        try {
          setApiKey(draft)
          close()
        } catch (cause) {
          setError((cause as Error).message)
        }
      }}
    >
      {!inline && (
        <>
          <header>
            <h2 id={id + '-title'}>Your AI, when you want it.</h2>
            <button type="button" aria-label="Close AI settings" onClick={close}>
              ×
            </button>
          </header>
          <p>
            Bring your own OpenAI API key. It stays in this tab’s memory, not in your stories or browser
            storage. Reloading forgets it.
          </p>
          <p>{disclosure}</p>
        </>
      )}
      <label htmlFor={id + '-key'}>OpenAI API key</label>
      <input
        id={id + '-key'}
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        placeholder={hasApiKey() ? 'Replace your key…' : 'Paste your key here · sk-…'}
        maxLength={503}
      />
      {inline && hasApiKey() && <small role="status">Key added for this tab.</small>}
      {error && <p role="alert">{error}</p>}
      <div className="ai-connection-actions">
        <button type="submit" disabled={!draft.trim()}>
          {hasApiKey() ? 'Replace key' : 'Use this key'}
        </button>
        {hasApiKey() && (
          <button
            type="button"
            onClick={() => {
              setApiKey('')
              close()
            }}
          >
            Disconnect AI
          </button>
        )}
        {!inline && (
          <button type="button" onClick={close}>
            Cancel
          </button>
        )}
      </div>
      {inline ? (
        <>
          <small>Kept in this tab only. Reloading forgets it.</small>
          <details>
            <summary>How your key is used</summary>
            <p>{disclosure}</p>
            <p>Key validity and model access are checked on your first AI request.</p>
          </details>
        </>
      ) : (
        <small>
          Disconnecting stops future requests; it cannot recall a request already sent. Key validity and model
          access are checked on your first AI request.
        </small>
      )}
    </form>
  )
  if (inline) return form
  return (
    <>
      <button type="button" className="ai-connect" onClick={() => dialog.current?.showModal()}>
        {hasApiKey() ? 'AI settings' : 'Connect AI'}
      </button>
      <dialog
        ref={dialog}
        className="ai-connection"
        aria-labelledby={id + '-title'}
        onClose={() => {
          setDraft('')
          setError('')
        }}
        onCancel={close}
      >
        {form}
      </dialog>
    </>
  )
}
