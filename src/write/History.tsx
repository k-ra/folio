import type { CSSProperties } from 'react'
import { MONO, SANS } from '../model/constants'
import type { Story, Style } from '../model/types'
import { fmtWhen } from '../model/util'

const mono: CSSProperties = { font: `400 10px ${MONO}`, letterSpacing: '1.5px' }

interface Props {
  story: Story
  V: Style
  open: boolean
  toggle: () => void
  restore: (t: number) => void
}

export default function History({ story, V, open, toggle, restore }: Props) {
  const hist = [...(story.history || [])].reverse()
  return (
    <div className="essay-history">
      <button
        onClick={toggle}
        title="History"
        aria-label="History"
        aria-expanded={open}
        aria-controls="story-history"
        className="rail-control hover-full"
        style={{
          borderRadius: '50%',
          border: '1px solid currentColor',
          font: `400 11px/1 ${MONO}`,
          opacity: open ? 1 : 0.5,
        }}
      >
        i
      </button>
      {open && (
        <div
          id="story-history"
          role="region"
          aria-label="Story history"
          style={{
            position: 'absolute',
            left: 0,
            bottom: 34,
            width: 260,
            maxWidth: 'calc(100vw - var(--rail-left) - 24px)',
            boxSizing: 'border-box',
            maxHeight: '50vh',
            overflow: 'auto',
            background: V.bg,
            color: V.ink,
            boxShadow: '0 24px 50px -24px rgba(0,0,0,.5), 0 0 0 1px rgba(128,128,128,.18)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            animation: 'fadein .2s ease both',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              ...mono,
              opacity: 0.5,
              marginBottom: 10,
            }}
          >
            <span>HISTORY</span>
            <span>
              {hist.length} {hist.length === 1 ? 'VERSION' : 'VERSIONS'}
            </span>
          </div>
          {hist.map((v, i) => (
            <button
              key={v.t + ':' + i}
              onClick={() => restore(v.t)}
              className="hover-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '52px 1fr auto',
                gap: 12,
                alignItems: 'baseline',
                textAlign: 'left',
                padding: '7px 6px',
                margin: '0 -6px',
                font: `400 12px ${SANS}`,
                opacity: i === 0 ? 1 : 0.75,
              }}
            >
              <span style={{ font: `400 10px ${MONO}`, opacity: 0.6 }}>{fmtWhen(v.t)}</span>
              <span>{v.label}</span>
              <span style={{ font: `400 10px ${MONO}`, opacity: 0.5 }}>{v.words.toLocaleString()}w</span>
            </button>
          ))}
          <div style={{ ...mono, letterSpacing: '1px', opacity: 0.4, marginTop: 10 }}>
            CLICK A VERSION TO RESTORE · RESTORING IS ITSELF A VERSION
          </div>
        </div>
      )}
    </div>
  )
}
