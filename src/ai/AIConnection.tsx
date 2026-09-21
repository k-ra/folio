import { useId, useRef, useState } from 'react'
import { useConnection } from './connection'
import { disableAI, hasApiKey, isAIDisabled, setApiKey } from './session'
import './connection.css'

/** One opt-in control, inline at home and in a small dialog inside the workshop. */
export default function AIConnection({ inline = false }: { inline?: boolean }) {
  const connection = useConnection()
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [choosing, setChoosing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const connected = !isAIDisabled() && (hasApiKey() || connection?.configured === true)
  const enabled = connected || choosing
  const reset = () => {
    setDraft('')
    setError('')
    setChoosing(false)
  }
  const close = () => {
    reset()
    dialog.current?.close()
  }
  if (!connection?.byok)
    return inline ? (
      <p className="ai-inline-help">{connection ? 'AI unavailable on this host.' : 'Checking AI…'}</p>
    ) : null

  const form = (
    <form
      className="ai-connection-form"
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
      <div className="ai-choice" role="group" aria-label="AI preference">
        <button type="button" aria-pressed={enabled} onClick={() => setChoosing(true)}>
          AI
        </button>
        <button
          type="button"
          aria-pressed={!enabled}
          onClick={() => {
            disableAI()
            reset()
          }}
        >
          No AI
        </button>
        {!inline && <button className="ai-close" type="button" aria-label="Close AI settings" onClick={close}>×</button>}
      </div>
      {enabled && (
        <>
          <label htmlFor={id + '-key'}>OpenAI API key</label>
          <div className="ai-key-row">
            <input
              id={id + '-key'}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              placeholder={hasApiKey() ? 'Replace key…' : 'sk-…'}
              maxLength={503}
            />
            <button type="submit" disabled={!draft.trim()}>
              Save
            </button>
          </div>
          {hasApiKey() && <small role="status">Connected for this tab.</small>}
          <small>Tab only · API charges apply.</small>
          <details>
            <summary>Privacy</summary>
            <p>
              Explicit AI requests send your key and relevant content through this site’s server to OpenAI.
              Use a deployment you trust. Reloading forgets the key; it is never saved with stories. Saving a
              key makes no model request. Turning AI off does not recall requests already sent.
            </p>
          </details>
        </>
      )}
      {error && <small role="alert">{error}</small>}
    </form>
  )
  if (inline) return <div className="ai-connection-inline">{form}</div>
  return (
    <>
      <button
        type="button"
        className="ai-connect"
        aria-label="AI settings"
        onClick={() => dialog.current?.showModal()}
      >
        {connected ? 'AI' : 'NO AI'}
      </button>
      <dialog
        ref={dialog}
        className="ai-connection"
        aria-label="AI settings"
        onClose={reset}
        onCancel={close}
      >
        {form}
      </dialog>
    </>
  )
}
