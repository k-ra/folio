import { useEffect, useState } from 'react'
import { simulated } from '../ai'
import { FOLIO_STYLE } from '../style/presets'
import type { Style } from '../model/types'
import { withHistory } from '../model/store'
import { sampleStyle } from '../model/sampleStyles'
import { mockEssay } from '../model/samples/mockEssay'
import Write from '../write/Write'
import { useConnection } from '../ai/connection'
import { bindApiKeyOwner } from '../ai/session'

const PAPERS = [
  { id: 'folio', name: 'Folio', style: FOLIO_STYLE },
  { id: 'tide', name: 'Tide', style: sampleStyle('s-colors')! },
  { id: 'alphabet', name: 'Alphabet', style: sampleStyle('s-night')! },
]

function initialPaper(): Style {
  return PAPERS.find((p) => p.id === new URLSearchParams(location.search).get('paper'))?.style || FOLIO_STYLE
}

/** An isolated, disposable review surface. Never reads or writes the user's stories. */
export default function Playground() {
  const connection = useConnection()
  useEffect(() => { bindApiKeyOwner(null) }, [])
  const [story, setStory] = useState(() => mockEssay(initialPaper()))
  const [run, setRun] = useState(0)
  const paper =
    PAPERS.find((p) =>
      (Object.keys(p.style) as (keyof Style)[]).every((key) => p.style[key] === story.style[key]),
    )?.id || 'custom'
  return (
    <>
      <Write
        key={run}
        story={story}
        isNew={false}
        ai={simulated}
        upStory={(fn, why) => setStory((s) => withHistory(s, fn, why))}
        upBlock={(id, fn, why) =>
          setStory((s) =>
            withHistory(s, (s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === id ? fn(b) : b)) }), why),
          )
        }
        goHome={() => location.assign(import.meta.env.BASE_URL)}
        saveError=""
      />
      <div className="playground-bar">
        <span>
          PLAYGROUND <span>Nothing here changes your stories.</span>
        </span>
        <span aria-label="AI connection">
          {connection === null
            ? 'Checking AI…'
            : connection.configured
              ? connection.provider || 'AI connected'
              : 'AI not connected'}
        </span>
        <select
          aria-label="Playground paper"
          value={paper}
          onChange={(e) => {
            const selected = PAPERS.find((p) => p.id === e.currentTarget.value)
            if (selected)
              setStory((s) => withHistory(s, (s) => ({ ...s, style: { ...selected.style } }), 'Restyled'))
          }}
        >
          {PAPERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          {paper === 'custom' && <option value="custom">Custom</option>}
        </select>
        <button
          onClick={() => {
            setStory(mockEssay(initialPaper()))
            setRun((n) => n + 1)
            window.scrollTo(0, 0)
          }}
        >
          Reset playground
        </button>
        <a href={import.meta.env.BASE_URL}>Your stories</a>
      </div>
    </>
  )
}
