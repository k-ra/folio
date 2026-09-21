import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { FancyBlock as Fancy } from '../model/types'
import { FONTS, MONO } from '../model/constants'
import type { WriteCtl } from '../write/ctl'
import AutoTextarea from '../ui/AutoTextarea'
import FormattedText from '../text/FormattedText'
import MarginNote from '../write/MarginNote'
import { fancyStyle } from './contract'
import { fancyInstruction, hasFancyDraft } from './state'
import './fancy.css'

export default function FancyBlock({ b, ctl }: { b: Fancy; ctl: WriteCtl }) {
  const [editing, setEditing] = useState(false)
  const [paused, setPaused] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const f = fancyStyle(b.fancy)
  const working = b.status === 'rendering'
  const animated = f.motion !== 'none' && !!b.text.trim()
  const unsent = hasFancyDraft(b)
  const hasNote = ctl.story.notes[b.id] !== undefined
  const showMargin = ctl.sel === b.id || !!fancyInstruction(b) || !!b.revisions?.length || hasNote
  const style = {
    fontFamily:
      f.font === 'body'
        ? FONTS[ctl.V.bodyFont]
        : f.font === 'header'
          ? FONTS[ctl.V.headerFont]
          : f.font === 'mono'
            ? MONO
            : FONTS[f.font],
    fontSize: f.size,
    fontWeight: f.weight,
    fontStyle: f.italic ? 'italic' : 'normal',
    lineHeight: f.lineHeight,
    textAlign: f.align,
    letterSpacing: f.ls,
    textTransform: f.transform,
    color: f.color,
    paddingBlock: f.pad,
    '--fancy-duration': `${f.duration}s`,
    '--fancy-direction': f.direction === 'right' ? 'reverse' : 'normal',
  } as CSSProperties
  useLayoutEffect(() => {
    if (editing && input.current && document.activeElement !== input.current) input.current.focus()
  }, [editing])
  const actOnMargin = () => {
    if (working) return
    if (unsent) void ctl.fancy.generate(b.id, undefined, true)
    else ctl.openArtifactChat(b.id)
  }
  return (
    <div className="fancy-block" data-testid={`fancy-${b.id}`}>
      <div className="fancy-surface" style={style}>
        {animated && !editing ? (
          <button
            className={`fancy-display fancy-${f.motion} ${paused ? 'is-paused' : ''}`}
            aria-label="Edit fancy text"
            title="Click to edit the words"
            aria-describedby={`fancy-words-${b.id}`}
            onFocus={() => ctl.focusBlock(b.id)}
            onClick={() => setEditing(true)}
          >
            <span className="fancy-motion-track">
              <span className="fancy-motion-copy" id={`fancy-words-${b.id}`}>
                <FormattedText text={b.text} marks={ctl.story.formatting?.[b.id]} />
              </span>
              {f.motion === 'marquee' && (
                <span className="fancy-motion-copy" aria-hidden="true">
                  <FormattedText text={b.text} marks={ctl.story.formatting?.[b.id]} />
                </span>
              )}
            </span>
          </button>
        ) : (
          <AutoTextarea
            ref={input}
            className="prose-input"
            data-id={b.id}
            aria-label="Fancy text"
            placeholder="something worth setting apart"
            value={b.text}
            rich={{
              marks: ctl.story.formatting?.[b.id],
              onChange: (v, m) => ctl.setBlockText(b.id, v, m),
            }}
            onChange={(e) => ctl.setBlockText(b.id, e.currentTarget.value)}
            onFocus={() => {
              setEditing(true)
              ctl.focusBlock(b.id)
            }}
            onBlur={() => setEditing(false)}
          />
        )}
      </div>
      {(animated || !!b.revisions?.length) && (
        <div className="fancy-tools">
          {animated && (
            <button
              className="fancy-pause"
              aria-label={paused ? 'Resume text animation' : 'Pause text animation'}
              aria-pressed={paused}
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
          )}
          {!!b.revisions?.length && (
            <details className="fancy-versions">
              <summary aria-label="Text style versions">···</summary>
              <div style={{ background: ctl.V.bg }}>
                <button
                  disabled={working || !b.revision}
                  onClick={() => ctl.fancy.restore(b.id, (b.revision ?? 0) - 1)}
                >
                  Undo style
                </button>
                <span>
                  {(b.revision ?? 0) + 1} / {b.revisions.length}
                </span>
                <button
                  disabled={working || (b.revision ?? 0) >= b.revisions.length - 1}
                  onClick={() => ctl.fancy.restore(b.id, (b.revision ?? 0) + 1)}
                >
                  Redo style
                </button>
              </div>
            </details>
          )}
        </div>
      )}
      {showMargin && (
        <MarginNote label="Text styling instructions" className="fancy-margin">
          <AutoTextarea
            className="prose-input"
            data-id={`edit-${b.id}`}
            aria-label="Text style instruction"
            placeholder="How should this text feel?"
            value={fancyInstruction(b)}
            disabled={working}
            onFocus={() => ctl.selectBlock(b.id)}
            onChange={(e) => ctl.fancy.setEdit(b.id, e.currentTarget.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                actOnMargin()
              }
            }}
          />
          <div className="margin-actions">
            {working ? (
              <>
                <span role="status">Styling…</span>
                <button onClick={() => ctl.fancy.cancel(b.id)}>Cancel</button>
              </>
            ) : (
              <button className="margin-send" onClick={actOnMargin}>
                {unsent ? 'Send to chat' : 'Open in chat'}
              </button>
            )}
          </div>
          {hasNote && (
            <AutoTextarea
              className="prose-input fancy-existing-note"
              aria-label="a note in the margin"
              data-id={`n-${b.id}`}
              value={ctl.story.notes[b.id]}
              placeholder="a note in the margin"
              onChange={(e) => ctl.setNote(b.id, e.currentTarget.value)}
              rich={{
                marks: ctl.story.formatting?.['n-' + b.id],
                onChange: (v, m) => ctl.setNote(b.id, v, m),
              }}
              onBlur={() => ctl.noteBlur(b.id)}
            />
          )}
        </MarginNote>
      )}
      {b.error && (
        <div role="alert" className="magic-error">
          {b.error} <button onClick={() => void ctl.fancy.generate(b.id)}>Retry</button>
        </div>
      )}
    </div>
  )
}
