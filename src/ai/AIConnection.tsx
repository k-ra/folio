import { useId, useRef, useState } from 'react'
import { useConnection } from './connection'
import { hasApiKey, setApiKey } from './session'
import './connection.css'

interface Props {
  disconnectedLabel?: string
  connectedLabel?: string
}

/** An explicit opt-in; connecting itself never calls a paid model. */
export default function AIConnection({ disconnectedLabel = 'Connect AI', connectedLabel = 'AI settings' }: Props) {
  const connection = useConnection()
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  if (!connection?.byok) return null
  const close = () => {
    setDraft('')
    setError('')
    dialog.current?.close()
  }
  return (
    <>
      <button type="button" className="ai-connect" onClick={() => dialog.current?.showModal()}>
        {hasApiKey() ? connectedLabel : disconnectedLabel}
      </button>
      <dialog
        ref={dialog}
        className="ai-connection"
        aria-labelledby={`${id}-title`}
        onClose={() => {
          setDraft('')
          setError('')
        }}
        onCancel={close}
      >
        <form
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
          <header>
            <h2 id={`${id}-title`}>Your AI, when you want it.</h2>
            <button type="button" aria-label="Close AI settings" onClick={close}>
              ×
            </button>
          </header>
          <p>
            Bring your own OpenAI API key. It stays in this tab’s memory, not in your stories or browser
            storage. Reloading forgets it.
          </p>
          <p>
            When you ask for AI help, this site’s server forwards your key and the relevant writing,
            instructions and attachments to OpenAI. Only use a deployment you trust. API charges apply;
            connecting alone makes no model request.
          </p>
          <label htmlFor={`${id}-key`}>OpenAI API key</label>
          <input
            id={`${id}-key`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder={hasApiKey() ? 'Replace your key…' : 'sk-…'}
            maxLength={503}
          />
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
            <button type="button" onClick={close}>
              Cancel
            </button>
          </div>
          <small>
            Disconnecting stops future requests; it cannot recall a request already sent. Key validity and
            model access are checked on your first AI request.
          </small>
        </form>
      </dialog>
    </>
  )
}
