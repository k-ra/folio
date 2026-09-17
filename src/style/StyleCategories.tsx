import type { ReactNode } from 'react'
import { FONTS, FONT_NAMES } from '../model/constants'
import type { FontName, Style } from '../model/types'
import type { WriteCtl } from '../write/ctl'
import AutoTextarea from '../ui/AutoTextarea'
import { PRESETS } from './presets'
import ChoiceGrid from './ChoiceGrid'
import ImageChoices from './ImageChoices'
import BackgroundChoices from './BackgroundChoices'
import ArtifactView from '../magic/ArtifactView'
import { IMAGE_MODELS, type ImageModel } from '../magic/models'

export type Category = 'type' | 'palette' | 'image' | 'graphics' | 'data' | 'page'

export default function StyleCategories({ category, ctl }: { category: Category; ctl: WriteCtl }) {
  const d = ctl.draft || ctl.S
  const option = <K extends keyof Style>(key: K, values: { value: Style[K]; label: string }[]) => (
    <div className="control-options">
      {values.map((v) => (
        <button
          key={String(v.value)}
          aria-pressed={d[key] === v.value}
          onClick={() => ctl.setDraft({ [key]: v.value })}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
  return (
    <>
      {category === 'type' && (
        <>
          <ChoiceGrid
            label="Text styles"
            choices={[
              { name: 'Folio', body: 'Instrument Sans', header: 'Instrument Sans' },
              { name: 'Editorial', body: 'Newsreader', header: 'Libre Caslon Text' },
              { name: 'Notebook', body: 'IBM Plex Mono', header: 'IBM Plex Mono' },
            ].map((p) => ({
              id: p.name,
              label: p.name,
              selected: d.bodyFont === p.body && d.headerFont === p.header,
              choose: () => ctl.setDraft({ bodyFont: p.body as FontName, headerFont: p.header as FontName }),
              sample: (
                <span className="type-study" style={{ fontFamily: FONTS[p.header as FontName] }}>
                  A line
                  <br />
                  becomes
                  <br />a story.
                </span>
              ),
            }))}
          />
          <Field name="Body font">
            <select
              aria-label="Body font"
              value={d.bodyFont}
              onChange={(e) => ctl.setDraft({ bodyFont: e.currentTarget.value as FontName })}
            >
              {FONT_NAMES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field name="Heading font">
            <select
              aria-label="Heading font"
              value={d.headerFont}
              onChange={(e) => ctl.setDraft({ headerFont: e.currentTarget.value as FontName })}
            >
              {FONT_NAMES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field name={`Type size · ${d.size}px`}>
            <input
              aria-label="Type size"
              type="range"
              min="12"
              max="24"
              value={d.size}
              onChange={(e) => ctl.setDraft({ size: Number(e.currentTarget.value) })}
            />
          </Field>
          <Field name={`Paragraph space · ${d.gap}px`}>
            <input
              aria-label="Paragraph space"
              type="range"
              min="12"
              max="64"
              step="4"
              value={d.gap}
              onChange={(e) => ctl.setDraft({ gap: Number(e.currentTarget.value) })}
            />
          </Field>
        </>
      )}
      {category === 'palette' && (
        <>
          <Field name="Palettes">
            <div className="palette-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  title={p.name}
                  aria-label={`${p.name} colors`}
                  onClick={() => ctl.setDraft({ bg: p.style.bg, ink: p.style.ink })}
                  style={{ background: p.style.bg, color: p.style.ink }}
                >
                  <span>◐</span>
                  {p.name}
                </button>
              ))}
            </div>
          </Field>
          {(['bg', 'ink'] as const).map((k) => (
            <Field name={k === 'bg' ? 'Paper color' : 'Ink color'} key={k}>
              <div className="color-field">
                <input
                  type="color"
                  aria-label={k === 'bg' ? 'Paper color' : 'Ink color'}
                  value={d[k]}
                  onChange={(e) => ctl.setDraft({ [k]: e.currentTarget.value })}
                />
                <span>{d[k]}</span>
              </div>
            </Field>
          ))}
          <Field name="Links">
            {option('linkStyle', [
              { value: 'underline', label: 'Underline' },
              { value: 'quiet', label: 'Quiet' },
              { value: 'highlight', label: 'Highlight' },
            ])}
          </Field>
        </>
      )}
      {category === 'image' && (
        <>
          <ImageChoices style={d} change={ctl.setDraft} />
          <p className="control-help">
            References guide new images when you generate. No words unless you ask for them or need diagram labels.
          </p>
          <Field name="Generation model">
            <select
              aria-label="Image model"
              value={d.imageModel || 'default'}
              onChange={(e) => ctl.setDraft({ imageModel: e.currentTarget.value as ImageModel })}
            >
              {IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <small className="model-help">
              {ctl.magic.connected
                ? 'Used for connected image generation.'
                : 'Saved for connected generation. The server is not connected yet.'}{' '}
              Local previews do not use a model.
            </small>
          </Field>
          <Field name="Your own direction">
            <AutoTextarea
              aria-label="Image direction"
              placeholder="Fine ink, plenty of white space…"
              value={d.imageDirection}
              onChange={(e) => ctl.setDraft({ imageDirection: e.currentTarget.value })}
            />
          </Field>
        </>
      )}
      {category === 'graphics' && (
        <>
          <ChoiceGrid
            label="Graphic styles"
            choices={[
              { n: 'Fine', v: 1 },
              { n: 'Light', v: 0.5 },
              { n: 'Bold', v: 2.5 },
            ].map((p) => ({
              id: p.n,
              label: p.n,
              detail: `${p.v}px stroke`,
              selected: d.strokeWidth === p.v,
              choose: () => ctl.setDraft({ strokeWidth: p.v }),
              sample: (
                <svg viewBox="0 0 160 110" fill="none" stroke="currentColor" strokeWidth={p.v}>
                  <circle cx="80" cy="54" r="30" />
                  <path d="M15 54 H145 M80 10 V98 M28 90 L132 20" />
                </svg>
              ),
            }))}
          />
          <Field name={`Stroke · ${d.strokeWidth}px`}>
            <input
              aria-label="Stroke width"
              type="range"
              min=".5"
              max="4"
              step=".25"
              value={d.strokeWidth}
              onChange={(e) => ctl.setDraft({ strokeWidth: Number(e.currentTarget.value) })}
            />
          </Field>
          <Field name="Your own direction">
            <AutoTextarea
              aria-label="Graphics direction"
              placeholder="A spare diagram. Labels that explain just enough."
              value={d.graphicDirection}
              onChange={(e) => ctl.setDraft({ graphicDirection: e.currentTarget.value })}
            />
          </Field>
        </>
      )}
      {category === 'data' && (
        <>
          <ChoiceGrid
            label="Data styles"
            choices={(
              [
                { value: 'line', label: 'Lines' },
                { value: 'bar', label: 'Bars' },
                { value: 'area', label: 'Area' },
              ] as const
            ).map((p) => ({
              id: p.value,
              label: p.label,
              selected: d.chartStyle === p.value,
              choose: () => ctl.setDraft({ chartStyle: p.value }),
              sample: (
                <ArtifactView
                  compact
                  style={d}
                  output={{
                    kind: 'chart',
                    chartStyle: p.value,
                    caption: p.label,
                    xLabel: '',
                    yLabel: '',
                    points: [14, 30, 24, 48, 40, 62].map((value, i) => ({ label: String(i + 1), value })),
                  }}
                />
              ),
            }))}
          />
          <p className="control-help">
            New data artifacts start here. You can change an individual chart in its margin: “use bars” or “use a line.”
          </p>
          <Field name={`Stroke · ${d.strokeWidth}px`}>
            <input
              aria-label="Data stroke width"
              type="range"
              min=".5"
              max="4"
              step=".25"
              value={d.strokeWidth}
              onChange={(e) => ctl.setDraft({ strokeWidth: Number(e.currentTarget.value) })}
            />
          </Field>
        </>
      )}
      {category === 'page' && <BackgroundChoices ctl={ctl} />}
    </>
  )
}

function Field({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="control-field">
      <div className="eyebrow">{name}</div>
      {children}
    </div>
  )
}
