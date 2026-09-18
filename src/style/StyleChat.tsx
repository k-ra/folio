import { useEffect, useRef, useState } from 'react'
import type { CustomStyleCategory } from '../model/types'
import type { WriteCtl } from '../write/ctl'
import { apiFetch } from '../ai/session'
import AIConnection from '../ai/AIConnection'
import AutoTextarea from '../ui/AutoTextarea'
import ArtifactView from '../magic/ArtifactView'
import { styleContext, styleResultPatch, validStyleResult } from './chatContract'
import './styleChat.css'

const invitations = {
  graphics:
    'A little living world: drifting particles, delicate connections, something that responds to touch…',
  data: 'A reef of radial marks. Let me scrub through time and inspect each observation…',
  palette: 'Warm paper, deep sea ink, the feeling of late afternoon…',
  page: 'Soft pools of light behind the writing. A slow underwater glow…',
}

export default function StyleChat({
  category,
  ctl,
  input,
  setInput,
}: {
  category: CustomStyleCategory
  ctl: WriteCtl
  input: string
  setInput: (value: string) => void
}) {
  const d = ctl.draft || ctl.S
  const custom = d.customStyles?.[category]
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const log = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [custom?.history])
  // Reset, preset changes, category navigation and closing cannot receive a late response.
  useEffect(() => {
    request.current?.abort()
    request.current = null
    setPending(false)
    setError('')
    return () => request.current?.abort()
  }, [d, category])
  const send = async () => {
    const instruction = input.trim()
    if (!instruction || request.current || !ctl.magic.connected) return
    const controller = new AbortController()
    request.current = controller
    setPending(true)
    setError('')
    try {
      const response = await apiFetch('/api/style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          category,
          instruction,
          history: custom?.history || [],
          current: styleContext(d, category),
        }),
      })
      const result: unknown = await response.json()
      if (!response.ok)
        throw new Error((result as { error?: string })?.error || 'Could not finish this style.')
      if (!validStyleResult(result, category))
        throw new Error('The style response was incomplete. Please retry.')
      if (!controller.signal.aborted) {
        ctl.setDraft(styleResultPatch(d, category, instruction, result))
        setInput('')
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Could not connect. Please retry.')
    } finally {
      if (request.current === controller) {
        request.current = null
        setPending(false)
      }
    }
  }
  return (
    <section className="style-chat" aria-label="Custom style conversation">
      <div className="eyebrow">{custom?.name || 'Make it yours'}</div>
      {custom?.sample && (
        <div className="style-chat-study">
          <ArtifactView
            compact
            style={d}
            output={{ kind: 'html', html: custom.sample, caption: 'Style study' }}
          />
          <small>{category === 'data' ? 'Style study · sample data' : 'Style study'}</small>
        </div>
      )}
      {!!custom?.history.length && (
        <div ref={log} className="style-chat-log" role="log" aria-label="Style conversation">
          {custom.history.map((m, i) => (
            <p key={i} className={m.me ? 'from-you' : ''}>
              <small>{m.me ? 'YOU' : 'FOLIO'}</small>
              {m.text}
            </p>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <AutoTextarea
          aria-label="Custom style message"
          placeholder={invitations[category]}
          value={input}
          maxLength={3000}
          disabled={pending}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              void send()
            }
          }}
        />
        <div className="style-chat-actions">
          <button disabled={!ctl.magic.connected || pending || !input.trim()}>
            {pending ? 'Shaping your style…' : custom ? 'Refine style' : 'Create custom style'}
          </button>
          {pending && (
            <button
              type="button"
              onClick={() => {
                request.current?.abort()
                request.current = null
                setPending(false)
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      {!ctl.magic.connected && (
        <div>
          <AIConnection />
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <p className="control-help">
        {!ctl.magic.connected ? 'Connect AI to develop a custom style. ' : ''}
        {category === 'graphics' || category === 'data'
          ? 'Apply saves this direction for your next generation. Existing artifacts keep their own edits.'
          : 'Preview it on the page, then Apply to keep it.'}
      </p>
      {custom && (
        <details>
          <summary>Saved direction</summary>
          <p className="control-help">{custom.direction}</p>
        </details>
      )}
    </section>
  )
}
