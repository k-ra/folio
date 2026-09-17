import { useEffect, useRef } from 'react'
import { FONTS } from '../model/constants'
import AutoTextarea from '../ui/AutoTextarea'
import type { WriteCtl } from './ctl'
import { focusLabel } from './focus'
import ControlPanel from '../style/ControlPanel'
import { currentRevision } from '../magic/state'

export default function Panel({ ctl }: { ctl: WriteCtl }) {
  const { panel, story, S } = ctl
  const bottom = useRef<HTMLDivElement>(null)
  const key = panel?.kind === 'block' ? panel.id : panel?.kind
  const msgs = (key && story.chats[key]) || []
  const block = panel?.kind === 'block' ? story.blocks.find((b) => b.id === panel.id) : null
  const artifact = block?.type === 'magic' ? block : null
  const fancy = block?.type === 'fancy' ? block : null
  const editable = artifact || fancy
  const working = ctl.busy || editable?.status === 'rendering'
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [msgs.length, working, key])
  if (panel?.kind === 'style') return <ControlPanel ctl={ctl} />
  const focus = artifact
    ? {
        kind: `Editing ${artifact.mode === 'data' ? 'data visualization' : artifact.mode === 'image' ? 'image' : 'graphic'}`,
        quote: currentRevision(artifact)?.output.caption || artifact.prompt,
      }
    : fancy
      ? { kind: 'Styling text', quote: fancy.text }
      : panel?.kind === 'chat' && ctl.chatFocus
        ? focusLabel(story, ctl.chatFocus)
        : null
  const title = panel?.kind === 'data' ? 'Data' : 'Chat'
  return (
    <section
      className="chat-panel"
      aria-label={artifact ? 'Artifact chat' : fancy ? 'Text styling chat' : title}
      style={{ background: S.bg, color: S.ink, fontFamily: FONTS[S.bodyFont] }}
    >
      <header className="panel-header">
        <h2>{title.toUpperCase()}</h2>
        <button aria-label="Close chat panel" onClick={ctl.closePanel}>
          ×
        </button>
      </header>
      {panel?.kind === 'data' && (
        <div className="data-files">
          {story.blocks
            .flatMap((b) => (b.type === 'magic' ? b.attachments : []))
            .map((f) => (
              <div key={f.id}>
                <span>{f.name}</span>
                <small>{f.kind}</small>
              </div>
            ))}
          {!story.blocks.some((b) => b.type === 'magic' && b.attachments.length) && (
            <p>Add a CSV, TSV, or reference image through a magic block. Its attachments will appear here.</p>
          )}
        </div>
      )}
      <div className="chat-messages" role="log" aria-label="Conversation">
        {!msgs.length && (
          <div className="chat-empty">
            {editable
              ? 'Keep the good parts. Change the rest.'
              : 'A second pair of eyes, whenever you need one.'}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={'chat-message ' + (m.me ? 'from-me' : '')}>
            {m.focus && <div className="eyebrow">{m.focus}</div>}
            <span className="eyebrow">{m.me ? 'YOU' : 'FOLIO'}</span>
            <p>{m.text}</p>
          </div>
        ))}
        {working && (
          <div className="chat-working" role="status">
            <span className="loading-dot" />
            {fancy ? 'Styling your text…' : artifact ? 'Working on your edit…' : 'Thinking…'}
            {fancy && <button onClick={() => ctl.fancy.cancel(fancy.id)}>Cancel</button>}
          </div>
        )}
        {editable?.error && (
          <p role="alert" className="magic-error">
            {editable.error} Your instruction is saved in the margin.
          </p>
        )}
        {!editable && ctl.chatError && (
          <p role="alert" className="magic-error">
            {ctl.chatError}
          </p>
        )}
        <div ref={bottom} />
      </div>
      <footer className="chat-footer">
        {focus && (
          <div className="chat-focus" aria-label={editable ? 'Editing artifact' : 'Chat reference'}>
            <span title={[focus.kind, focus.quote].filter(Boolean).join(' · ')}>
              {focus.kind}
              {focus.quote ? ` · ${focus.quote}` : ''}
            </span>
            <button aria-label="Clear chat focus" title="Return to story chat" onClick={ctl.clearFocus}>
              ×
            </button>
          </div>
        )}
        <AutoTextarea
          data-id="chat"
          aria-label="Chat message"
          placeholder={
            fancy
              ? 'How should this text feel?'
              : artifact
                ? 'What should change next?'
                : 'Ask about the piece…'
          }
          value={ctl.chatInput}
          onChange={(e) => ctl.setChatInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void ctl.sendChat()
            }
          }}
        />
        <div className="chat-send-row">
          <button disabled={working || !ctl.chatInput.trim()} onClick={ctl.sendChat}>
            Send
          </button>
        </div>
      </footer>
    </section>
  )
}
