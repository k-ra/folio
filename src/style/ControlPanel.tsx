import { useLayoutEffect, useRef, useState } from 'react'
import { FONTS, BACKDROP_NAMES } from '../model/constants'
import type { WriteCtl } from '../write/ctl'
import StyleSample from './StyleSample'
import StyleCategories, { type Category } from './StyleCategories'
import { GRAPHIC_STYLES, PRESETS, sameStyle, sameAppearance } from './presets'
import { imageStyleLabel } from './imageStudies'
import { IMAGE_MODELS } from '../magic/models'
import StyleWorkspace from './StyleWorkspace'
import type { CustomStyleCategory } from '../model/types'

const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'type', name: 'Text' },
  { id: 'palette', name: 'Color' },
  { id: 'image', name: 'Images' },
  { id: 'graphics', name: 'Graphics' },
  { id: 'data', name: 'Data' },
  { id: 'page', name: 'Background' },
]

export default function ControlPanel({ ctl }: { ctl: WriteCtl }) {
  const [category, setCategory] = useState<Category | 'theme' | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [styleInputs, setStyleInputs] = useState<Partial<Record<CustomStyleCategory, string>>>({})
  const panel = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const previousCategory = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (category) heading.current?.focus({ preventScroll: true })
    else if (previousCategory.current)
      panel.current
        ?.querySelector<HTMLButtonElement>(`[data-category="${previousCategory.current}"]`)
        ?.focus({ preventScroll: true })
    previousCategory.current = category
  }, [category])
  const d = ctl.draft || ctl.S
  const presets = [...PRESETS, ...(ctl.story.presets || [])]
  const selected = presets.find((p) => sameAppearance(p.style, d))
  const dirty = !sameStyle(d, ctl.S)
  const summaries: Record<Category, { value: string; detail: string }> = {
    type: { value: d.bodyFont, detail: `${d.size}px · ${d.headerFont} headings` },
    palette: { value: d.customStyles?.palette?.name || d.ink, detail: `${d.bg} · ${d.linkStyle} links` },
    image: {
      value: imageStyleLabel(d),
      detail: IMAGE_MODELS.find((m) => m.id === d.imageModel)?.name || 'Server default',
    },
    graphics: {
      value:
        d.customStyles?.graphics?.name ||
        GRAPHIC_STYLES.find((p) => p.direction === d.graphicDirection)?.name ||
        'Your direction',
      detail: d.graphicDirection || 'No extra direction',
    },
    data: {
      value:
        d.customStyles?.data?.name ||
        (d.chartStyle === 'bar' ? 'Bars' : d.chartStyle === 'area' ? 'Area' : 'Lines'),
      detail: d.dataDirection || 'Explore your data',
    },
    page: {
      value: d.customStyles?.page?.name || (d.paper === 'full' ? 'Full page' : 'Floating sheet'),
      detail: `${BACKDROP_NAMES[d.backdrop]} backdrop`,
    },
  }
  const title = category === 'theme' ? 'Themes' : CATEGORIES.find((c) => c.id === category)?.name || 'Style'
  return (
    <section
      ref={panel}
      className="control-panel"
      aria-label="Style panel"
      style={{ background: d.bg, color: d.ink, fontFamily: FONTS[d.bodyFont] }}
    >
      <header className="panel-header">
        <div>
          {category && (
            <button className="style-back" aria-label="Back to Style" onClick={() => setCategory(null)}>
              ← Style
            </button>
          )}
          <h2 ref={heading} tabIndex={-1}>
            {title}
          </h2>
        </div>
        <button aria-label="Close style" onClick={() => ctl.togglePanel('style')}>
          ×
        </button>
      </header>
      <div className="control-scroll" key={category || 'overview'}>
        {!category && (
          <>
            <div className="style-categories" aria-label="Current style choices">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className="style-category"
                  aria-label={c.name}
                  data-category={c.id}
                  onClick={() => setCategory(c.id)}
                >
                  <span className="eyebrow">{c.name}</span>
                  <span className="style-choice" title={summaries[c.id].value}>
                    {c.id === 'palette' && (
                      <span className="color-swatches" aria-hidden="true">
                        <i style={{ background: d.ink }} />
                        <i style={{ background: d.bg }} />
                      </span>
                    )}
                    {summaries[c.id].value}
                  </span>
                  <small title={summaries[c.id].detail}>{summaries[c.id].detail}</small>
                </button>
              ))}
            </div>
            <button className="theme-entry" data-category="theme" onClick={() => setCategory('theme')}>
              <span>Theme</span>
              <span>{selected?.name || 'Your mix'}</span>
            </button>
            <details className="style-preview" open>
              <summary>Live sample</summary>
              <StyleSample style={d} />
            </details>
          </>
        )}
        {category && (
          <div id="style-detail">
            {category === 'theme' ? (
              <div className="category-detail">
                <p className="control-help">
                  A starting point for everything. Keep it as it is, or make it yours.
                </p>
                <div className="preset-grid">
                  {presets.map((p) => (
                    <button
                      className="preset-card"
                      key={p.id}
                      aria-pressed={selected?.id === p.id}
                      onClick={() => ctl.setDraft({ ...p.style, imageModel: d.imageModel })}
                    >
                      <StyleSample style={p.style} miniature />
                      <span>
                        {p.name}
                        {selected?.id === p.id && <span aria-hidden="true">●</span>}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="custom-actions">
                  <button
                    onClick={() => {
                      setSaving(!saving)
                      setName('')
                    }}
                  >
                    + Save your mix
                  </button>
                </div>
                {saving && (
                  <form
                    className="save-preset"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (name.trim()) {
                        ctl.savePreset(name.trim())
                        setSaving(false)
                      }
                    }}
                  >
                    <input
                      aria-label="Preset name"
                      maxLength={40}
                      placeholder="Name this combination"
                      value={name}
                      onChange={(e) => setName(e.currentTarget.value)}
                    />
                    <button disabled={!name.trim()}>Save</button>
                    <small>Saved with this story.</small>
                  </form>
                )}
              </div>
            ) : (
              category && (
                <div className="category-detail" key={category}>
                  {(['graphics', 'data', 'palette', 'page'] as string[]).includes(category) ? (
                    <StyleWorkspace
                      category={category as CustomStyleCategory}
                      ctl={ctl}
                      input={styleInputs[category as CustomStyleCategory] || ''}
                      setInput={(value) => setStyleInputs((old) => ({ ...old, [category]: value }))}
                    />
                  ) : (
                    <StyleCategories category={category} ctl={ctl} />
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
      <footer className="control-footer">
        <span className="eyebrow">{dirty ? 'PREVIEWING' : 'APPLIED'}</span>
        <button disabled={!dirty} onClick={ctl.resetStyle}>
          Reset
        </button>
        <button className="apply-style" disabled={!dirty} onClick={ctl.applyStyle}>
          Apply
        </button>
      </footer>
    </section>
  )
}
