import { useLayoutEffect, useRef, useState } from 'react'
import type { CustomStyleCategory } from '../model/types'
import type { WriteCtl } from '../write/ctl'
import StyleCategories from './StyleCategories'
import StyleChat from './StyleChat'
import StyleStudy from './StyleStudy'

/** Choose a visual starting point OR work on a custom look, never two competing editors. */
export default function StyleWorkspace({
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
  const [making, setMaking] = useState(false)
  const workspace = useRef<HTMLDivElement>(null)
  const d = ctl.draft || ctl.S
  const custom = d.customStyles?.[category]
  useLayoutEffect(() => {
    const scroll = workspace.current?.closest('.control-scroll')
    if (scroll) scroll.scrollTop = 0
  }, [making])
  return (
    <div ref={workspace} className="style-workspace">
      <div className="style-mode" role="group" aria-label="Style workspace">
        <button aria-pressed={!making} onClick={() => setMaking(false)}>
          Choose a look
        </button>
        <button aria-pressed={making} onClick={() => setMaking(true)}>
          Make your own
        </button>
      </div>
      {making ? (
        <StyleChat category={category} ctl={ctl} input={input} setInput={setInput} />
      ) : (
        <>
          {custom && (
            <button
              className="your-style"
              onClick={() => setMaking(true)}
              aria-label={`Refine ${custom.name}`}
            >
              <span className="eyebrow">YOUR STYLE</span>
              <span>{custom.name}</span>
              <span>Refine</span>
            </button>
          )}
          {/* Previously saved CSS stays visible and refinable, without exposing a code editor. */}
          {category === 'page' && d.backdrop === 'custom' && !custom && (
            <button className="your-style" onClick={() => setMaking(true)}>
              <span>Your background</span>
              <span>Refine</span>
            </button>
          )}
          {category === 'page' && d.backdrop === 'custom' && <StyleStudy style={d} category={category} />}
          <StyleCategories category={category} ctl={ctl} />
        </>
      )}
    </div>
  )
}
