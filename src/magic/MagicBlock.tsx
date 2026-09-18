import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { MagicBlock as Magic, MagicMode } from '../model/types'
import type { WriteCtl } from '../write/ctl'
import AutoTextarea from '../ui/AutoTextarea'
import { currentRevision, hasUnsentInstruction, marginInstruction } from './state'
import { readAttachment } from './data'
import ArtifactView from './ArtifactView'
import Loading from './Loading'
import MarginNote from '../write/MarginNote'
import ArtifactControls, { Attachments, GenerationSelect, LayoutSelect } from './ArtifactControls'
import { sourceCaption } from './source'

const MODES: { id: MagicMode; label: string; placeholder: string }[] = [
  { id: 'image', label: 'Image', placeholder: 'Ask to generate an image of something you can almost see…' },
  {
    id: 'graphics',
    label: 'Graphics',
    placeholder: 'Ask for a diagram, a little world, a decorative animation, something to play with…',
  },
  { id: 'data', label: 'Data', placeholder: 'Ask to visualize your data in some way…' },
]

export default function MagicBlock({ b, ctl }: { b: Magic; ctl: WriteCtl }) {
  const [uploadError, setUploadError] = useState('')
  const surface = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(278)
  const revision = currentRevision(b),
    working = b.status === 'rendering'
  const unsent = hasUnsentInstruction(b)
  const fullBleed = b.layout === 'full-bleed' && (!!revision || working)
  useEffect(() => {
    // Sandboxed iframe clicks don't bubble. Observe focus on the frame element,
    // without reading its document or relaxing the artifact's isolation.
    let timer: ReturnType<typeof setTimeout>
    const selectFrame = () => {
      timer = setTimeout(() => {
        if (document.activeElement?.tagName === 'IFRAME' && surface.current?.contains(document.activeElement))
          ctl.selectBlock(b.id)
      }, 0)
    }
    window.addEventListener('blur', selectFrame)
    return () => {
      window.removeEventListener('blur', selectFrame)
      clearTimeout(timer)
    }
  }, [b.id, ctl.selectBlock])
  const actOnMargin = () => {
    if (working || (unsent && !marginInstruction(b).trim())) return
    if (unsent) void ctl.magic.generate(b.id, undefined, true)
    else ctl.openArtifactChat(b.id)
  }
  useLayoutEffect(() => {
    const el = surface.current
    if (!el || working) return
    const measure = () => setHeight(Math.max(1, el.clientHeight))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [working, revision])
  const attach = async (files: File[]) => {
    setUploadError('')
    try {
      if (files.length + b.attachments.length > 4)
        throw new Error('Keep up to four attachments in a magic block.')
      ctl.magic.attach(b.id, await Promise.all(files.map(readAttachment)))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Could not read that file.')
    }
  }
  return (
    <div
      className={`magic-block ${fullBleed ? 'is-full-bleed' : ''}`}
      data-layout={b.layout || 'column'}
      data-testid={`magic-${b.id}`}
      style={{ '--artifact-height': `${height}px` } as CSSProperties}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={surface}
        className={`magic-surface ${revision ? 'has-artifact' : ''} ${ctl.sel === b.id ? 'is-selected' : ''}`}
        tabIndex={revision ? 0 : undefined}
        role={revision ? 'group' : undefined}
        aria-label={revision ? `${MODES.find((m) => m.id === b.mode)!.label} artifact` : undefined}
        onClick={() => ctl.selectBlock(b.id)}
        onFocus={() => ctl.selectBlock(b.id)}
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          if (!working) void attach([...e.dataTransfer.files])
        }}
      >
        {!revision && !working && (
          <>
            <details className="prompt-settings">
              <summary aria-label="Prompt settings">···</summary>
              <div className="prompt-settings-popover" style={{ background: ctl.V.bg }}>
                <LayoutSelect b={b} ctl={ctl} />
                <GenerationSelect b={b} ctl={ctl} />
              </div>
            </details>
            <div className="magic-composer">
              <AutoTextarea
                aria-label="Magic prompt"
                data-id={b.id}
                value={b.prompt}
                onChange={(e) => ctl.setBlockPrompt(b.id, e.currentTarget.value)}
                placeholder={MODES.find((m) => m.id === b.mode)!.placeholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void ctl.magic.generate(b.id)
                  }
                }}
                className="magic-prompt"
              />
              <Attachments b={b} ctl={ctl} />
              {b.mode === 'image' && (
                <button
                  className="image-background-toggle"
                  aria-pressed={(b.imageBackground || ctl.V.imageBackground) === 'transparent'}
                  onClick={() =>
                    ctl.magic.setImageBackground(
                      b.id,
                      (b.imageBackground || ctl.V.imageBackground) === 'transparent'
                        ? 'opaque'
                        : 'transparent',
                    )
                  }
                >
                  Remove background
                </button>
              )}
              <div className="magic-composer-footer">
                <div className="mode-toggle" role="group" aria-label="Artifact type">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      aria-pressed={b.mode === m.id}
                      onClick={() => ctl.magic.setMode(b.id, m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <button
                  className="create-button"
                  disabled={!b.prompt.trim()}
                  onClick={() => void ctl.magic.generate(b.id)}
                >
                  Create
                </button>
              </div>
            </div>
          </>
        )}
        {working ? (
          <div className="magic-progress">
            <Loading treatment="weave" mode={b.mode} height={height} />
            <button className="cancel-generation" onClick={() => ctl.magic.cancel(b.id)}>
              Cancel
            </button>
          </div>
        ) : (
          revision && (
            <div className="artifact-reveal">
              <ArtifactView
                output={revision.output}
                style={{ ...ctl.V, strokeWidth: revision.style.strokeWidth }}
                fullBleed={fullBleed}
              />
            </div>
          )
        )}
      </div>
      {revision && (
        <>
          <div className="artifact-footer">
            <details className="artifact-settings">
              <summary aria-label="Artifact settings">···</summary>
              <div className="artifact-settings-popover" style={{ background: ctl.V.bg }}>
                <details>
                  <summary>Original prompt</summary>
                  <p>{b.prompt}</p>
                </details>
                <ArtifactControls b={b} ctl={ctl} />
              </div>
            </details>
            <div className="artifact-caption" title={sourceCaption(b)}>
              {sourceCaption(b)}
            </div>
          </div>
          <MarginNote className="artifact-margin" label="Artifact edit instructions">
            <AutoTextarea
              className="prose-input"
              aria-label="Edit instruction"
              data-id={`edit-${b.id}`}
              placeholder="What should change?"
              value={marginInstruction(b)}
              onFocus={() => ctl.selectBlock(b.id)}
              disabled={working}
              onChange={(e) => ctl.magic.setEdit(b.id, e.currentTarget.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  actOnMargin()
                }
              }}
            />
            <div className="margin-actions">
              <button
                className="margin-send"
                disabled={working || (unsent && !marginInstruction(b).trim())}
                onClick={actOnMargin}
              >
                {unsent ? 'Send to chat' : 'Open in chat'}
              </button>
            </div>
          </MarginNote>
        </>
      )}
      {(b.error || uploadError) && (
        <div className="magic-error" role="alert">
          {b.error || uploadError}
          {b.error && <button onClick={() => void ctl.magic.generate(b.id)}>Retry</button>}
        </div>
      )}
    </div>
  )
}
