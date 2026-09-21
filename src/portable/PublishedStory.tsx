import { useState, type CSSProperties } from 'react'
import type { Story, Style, FancyParams, ArtifactOutput } from '../model/types'
import { FONTS, MONO } from '../model/constants'
import ArtifactView from '../magic/ArtifactView'
import Backdrop from '../write/Backdrop'
import { fancyStyle } from '../fancy/contract'

type ReadingBlock =
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'media'; src: string | null; text: string }
  | { id: string; type: 'padding'; h: number }
  | { id: string; type: 'fancy'; text: string; fancy: FancyParams }
  | {
      id: string
      type: 'artifact'
      output: ArtifactOutput
      style: Style
      fullBleed: boolean
    }
export interface Publication {
  title: string
  style: Style
  blocks: ReadingBlock[]
  notes: Record<string, string>
  sources: Story['sources']
}

export default function PublishedStory({ story }: { story: Publication }) {
  const s = story.style
  return (
    <div
      style={{
        color: s.ink,
        background: s.backdrop === 'none' ? s.bg : undefined,
        minHeight: '100vh',
      }}
    >
      <Backdrop view={s} base={s} />
      <main
        className={`publication ${s.paper === 'card' ? 'paper' : ''}`}
        style={
          {
            '--paper': s.bg,
            '--gap': `${s.gap}px`,
            fontFamily: FONTS[s.bodyFont],
            fontSize: s.size,
          } as CSSProperties
        }
      >
        <h1 style={{ fontFamily: FONTS[s.headerFont], fontWeight: 400 }}>{story.title}</h1>
        {story.blocks.map((b) => (
          <section key={b.id} className={b.type === 'artifact' && b.fullBleed ? 'bleed' : undefined}>
            {b.type === 'text' ? (
              <p>{b.text}</p>
            ) : b.type === 'media' ? (
              <figure>
                {b.src && <img src={b.src} alt={b.text} />}
                <figcaption>{b.text}</figcaption>
              </figure>
            ) : b.type === 'padding' ? (
              <div style={{ height: b.h }} />
            ) : b.type === 'fancy' ? (
              <Fancy text={b.text} params={b.fancy} style={s} />
            ) : (
              <figure>
                <ArtifactView output={b.output} style={b.style} fullBleed={b.fullBleed} />
                <figcaption>{b.output.caption}</figcaption>
              </figure>
            )}
            {story.notes[b.id] && <aside className="publication-note">{story.notes[b.id]}</aside>}
          </section>
        ))}
        {!!story.sources?.length && (
          <footer>
            {story.sources.map((source, i) => (
              <p key={i}>
                {/^https?:\/\//i.test(source.url) ? (
                  <a href={source.url} rel="noreferrer">
                    {source.label}
                  </a>
                ) : (
                  source.label
                )}
              </p>
            ))}
          </footer>
        )}
      </main>
    </div>
  )
}
function Fancy({ text, params, style }: { text: string; params: FancyParams; style: Style }) {
  const f = fancyStyle(params),
    [paused, setPaused] = useState(false)
  return (
    <div
      className="fancy-surface"
      style={
        {
          fontFamily:
            f.font === 'body'
              ? FONTS[style.bodyFont]
              : f.font === 'header'
                ? FONTS[style.headerFont]
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
      }
    >
      <div className={`fancy-display fancy-${f.motion} ${paused ? 'is-paused' : ''}`}>
        <span className="fancy-motion-track">
          <span className="fancy-motion-copy">{text}</span>
          {f.motion === 'marquee' && (
            <span className="fancy-motion-copy" aria-hidden="true">
              {text}
            </span>
          )}
        </span>
      </div>
      {f.motion !== 'none' && (
        <button className="fancy-pause" onClick={() => setPaused(!paused)}>
          {paused ? 'Resume' : 'Pause'}
        </button>
      )}
    </div>
  )
}
