import { useEffect, useRef, useState } from 'react'
import type { CustomStyleCategory, Style } from '../model/types'
import type { WriteCtl } from '../write/ctl'
import { apiFetch } from '../ai/session'
import AIConnection from '../ai/AIConnection'
import AutoTextarea from '../ui/AutoTextarea'
import StyleStudy from './StyleStudy'
import { categoryStyle } from './chatContract'
import { styleContext, styleResultPatch, validStyleResult } from './chatContract'
import './styleChat.css'

const invitations = {
  graphics:
    'A little living world: drifting particles, delicate connections, something that responds to touch…',
  data: 'A reef of radial marks. Let me scrub through time and inspect each observation…',
  palette: 'Warm paper, deep sea ink, the feeling of late afternoon…',
  page: 'Warm paper and deep blue ink, or soft pools of light behind the writing…',
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
  const custom = categoryStyle(d, category)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [previous, setPrevious] = useState<Style | null>(null)
  const accepted = useRef(custom)
  const request = useRef<AbortController | null>(null)
  const log = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (custom !== accepted.current) setPrevious(null)
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [custom])
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
        const patch = styleResultPatch(d, category, instruction, result)
        accepted.current = patch.customStyles?.[category]
        setPrevious(d)
        ctl.setDraft(patch)
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
      <StyleStudy style={d} category={category} />
      <div>
        <h3 className="style-custom-name">{custom?.name || 'What do you have in mind?'}</h3>
        <p className="control-help">
          {category === 'graphics' || category === 'data'
            ? 'Design a look for your next generation. Existing artifacts stay as they are.'
            : 'Describe the atmosphere. Preview it here and on your page.'}
        </p>
      </div>
      {custom && (
        <p className="style-reply" role="status">
          {custom.history.filter((m) => !m.me).slice(-1)[0]?.text}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <AutoTextarea
          aria-label="Custom style message"
          placeholder={custom ? 'What would you change?' : invitations[category]}
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
            {pending ? 'Making a preview…' : custom ? 'Refine preview' : 'Make a preview'}
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
          {!pending && previous && (
            <button
              type="button"
              onClick={() => {
                // setDraft merges: clear fields absent from the checkpoint as well.
                ctl.setDraft({
                  ...Object.fromEntries(Object.keys(d).map((key) => [key, undefined])),
                  ...previous,
                })
                setPrevious(null)
              }}
            >
              Undo last refinement
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
        {!ctl.magic.connected ? 'Connect AI to make a preview. ' : ''}Nothing is saved until you Apply.
      </p>
      {!!custom?.history.length && (
        <details className="style-history">
          <summary>Earlier refinements</summary>
          <div ref={log} className="style-chat-log" role="log" aria-label="Style conversation">
            {custom.history.map((m, i) => (
              <p key={i} className={m.me ? 'from-you' : ''}>
                <small>{m.me ? 'YOU' : 'FOLIO'}</small>
                {m.text}
              </p>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
