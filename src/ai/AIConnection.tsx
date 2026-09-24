import { useId, useRef, useState, useSyncExternalStore } from 'react'
import { useConnection } from './connection'
import {
  disableAI,
  forgetApiKey,
  getAIProvider,
  getAIRequestState,
  hasApiKey,
  hasRememberedApiKey,
  isAIDisabled,
  rememberApiKey,
  resumeAI,
  selectAIProvider,
  subscribeAIRequestState,
} from './session'
import './connection.css'

/** One opt-in control, inline at home and in a small dialog inside the workshop. */
export default function AIConnection({ inline = false }: { inline?: boolean }) {
  const connection = useConnection()
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [choosing, setChoosing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const provider = getAIProvider()
  const providerName = provider === 'anthropic' ? 'Anthropic' : 'OpenAI'
  const requestState = useSyncExternalStore(subscribeAIRequestState, getAIRequestState)
  const connected = !isAIDisabled() && (hasApiKey() || connection?.configured === true)
  const enabled = connected || choosing
  const failed = !!error || (connected && requestState === 'error')
  const statusTitle = failed
    ? error || 'The last AI request failed. Try again or replace your key.'
    : requestState === 'connected'
      ? 'Connected · last request succeeded'
      : 'Key connected · not yet verified by a request'
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
          if (rememberApiKey(draft)) close()
          else setError('AI works for this tab, but this browser could not remember the key.')
        } catch (cause) {
          setError((cause as Error).message)
        }
      }}
    >
      <div className="ai-connection-line">
        <div className="ai-choice" role="group" aria-label="AI preference">
          <button type="button" aria-pressed={enabled} onClick={() => {
            if (!resumeAI()) setChoosing(true)
            else reset()
          }}>
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
        </div>
        {choosing && (
          <>
            <select
              className="ai-provider"
              aria-label="AI provider"
              value={provider}
              onChange={(e) => {
                selectAIProvider(e.currentTarget.value as 'openai' | 'anthropic')
                setDraft('')
                setError('')
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <div className="ai-key-row">
              <input
                id={id + '-key'}
                aria-label={`${providerName} API key`}
                aria-describedby={id + '-privacy'}
                title="Saved on this browser only · API charges apply. Not saved with stories."
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                placeholder={hasApiKey() ? 'Connected · replace key…' : `${providerName} key`}
                maxLength={503}
                autoFocus
                aria-invalid={!!error}
              />
              {draft.trim() ? <button type="submit">Save</button> : hasRememberedApiKey() ? (
                <button type="button" onClick={() => { forgetApiKey(); reset() }}>Forget</button>
              ) : <button type="submit" disabled>Save</button>}
            </div>
            <span id={id + '-privacy'} className="ai-accessible-help">
              Saved only in this browser, separately for each signed-in account and provider. Google sign-in does not
              encrypt or sync the key. Anyone with access to this browser or site scripts may read it.
              Explicit AI requests send the key and relevant content through this site’s server to {providerName}.
              Anthropic supports chat and code-based visuals here; image generation and web research require OpenAI.
              Use a deployment you trust. API charges apply. The key is never saved with stories or exports.
            </span>
          </>
        )}
        {(connected || failed) && (
          <button
            type="button"
            className={`ai-indicator${failed ? ' ai-indicator-error' : ''}`}
            aria-label={failed ? 'AI connection error' : 'AI connected'}
            title={statusTitle}
            onClick={() => setChoosing(true)}
          >
            {failed ? '!' : <span aria-hidden="true">●</span>}
          </button>
        )}
        {!inline && (
          <button className="ai-close" type="button" aria-label="Close AI settings" onClick={close}>
            ×
          </button>
        )}
      </div>
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
        {connected && (
          <span className={`ai-indicator${failed ? ' ai-indicator-error' : ''}`} title={statusTitle}>
            {failed ? '!' : '●'}
          </span>
        )}
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
