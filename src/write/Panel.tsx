import { useEffect, useRef } from 'react'
import { FONTS } from '../model/constants'
import AutoTextarea from '../ui/AutoTextarea'
import type { WriteCtl } from './ctl'
import { focusLabel } from './focus'
import ControlPanel from '../style/ControlPanel'
import { currentRevision } from '../magic/state'
import Markdown from '../text/Markdown'
import { IndexContents, type IndexStudy } from './IndexStudy'
import ChatSettings from './ChatSettings'

export default function Panel({
  ctl,
  index,
  indexBeside = false,
  canSplitIndex = false,
}: {
  ctl: WriteCtl
  index?: IndexStudy
  indexBeside?: boolean
  canSplitIndex?: boolean
}) {
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
  const tabs = (
    <span className="index-tabs">
      <button aria-pressed={!index?.open} onClick={() => index?.setOpen(false)}>
        CHAT
      </button>
      <button aria-pressed={index?.open} onClick={() => index?.setOpen(true)}>
        INDEX
      </button>
    </span>
  )
  const splitButton = index && canSplitIndex && (
    <button
      className="index-split-toggle"
      aria-label="Show chat and index side by side"
      aria-pressed={indexBeside}
      title={indexBeside ? 'Return to a single drawer' : 'Chat, index and essay side by side'}
      onClick={() => {
        index.setBeside(!indexBeside)
        index.setOpen(!indexBeside)
      }}
    >
      <svg
        width="17"
        height="15"
        viewBox="0 0 17 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="15" height="13" rx="1" />
        <path d="M6 1v13M11 1v13" />
      </svg>
    </button>
  )
  return (
    <div className="conversation-layout">
      <section
        className="chat-panel conversation-chat"
        aria-label={artifact ? 'Artifact chat' : fancy ? 'Text styling chat' : title}
        style={{
          background: S.bg,
          color: S.ink,
          fontFamily: FONTS[S.bodyFont],
          display: index?.open && !indexBeside ? 'none' : undefined,
        }}
      >
        <header className="panel-header">
          <h2>{index && !indexBeside ? tabs : title.toUpperCase()}</h2>
          <span className="panel-header-actions">
            {splitButton}
            <button aria-label="Close chat panel" onClick={ctl.closePanel}>
              ×
            </button>
          </span>
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
              <p>
                Add a CSV, TSV, or reference image through a magic block. Its attachments will appear here.
              </p>
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
              <div data-index-message={index ? String(i) : undefined}>
                <Markdown>{m.text}</Markdown>
              </div>
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
          {panel?.kind === 'chat' && <ChatSettings ctl={ctl} />}
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
            markdown
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
      {index && (
        <section
          className="chat-panel index-panel"
          aria-label="Index"
          style={{
            background: S.bg,
            color: S.ink,
            fontFamily: FONTS[S.bodyFont],
            display: index.open || indexBeside ? undefined : 'none',
          }}
        >
          <header className="panel-header">
            <h2>{indexBeside ? 'INDEX' : tabs}</h2>
            <span className="panel-header-actions">
              {!indexBeside && splitButton}
              <button
                aria-label={indexBeside ? 'Close index' : 'Close chat panel'}
                onClick={() => {
                  if (indexBeside) {
                    index.setBeside(false)
                    index.setOpen(false)
                  } else ctl.closePanel()
                }}
              >
                ×
              </button>
            </span>
          </header>
          <IndexContents study={index} />
        </section>
      )}
    </div>
  )
}
