import type { Style } from '../model/types'
import type { WriteCtl } from '../write/ctl'
import ChoiceGrid from './ChoiceGrid'
import { PRESETS } from './presets'
import { GRADIENT_DEFAULTS, GRADIENTS, gradientCss } from './backgrounds'
import './backgrounds.css'

export default function BackgroundChoices({ ctl }: { ctl: WriteCtl }) {
  const d = ctl.draft || ctl.S
  const choose = (patch: Partial<Style>) => {
    ctl.setDraft({ ...patch, customStyles: { ...d.customStyles, page: undefined, palette: undefined } })
  }
  return (
    <>
      <div className="control-field">
        <div className="eyebrow">Palette</div>
        <div className="palette-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              aria-label={`${p.name} colors`}
              aria-pressed={d.bg === p.style.bg && d.ink === p.style.ink}
              onClick={() => choose({ bg: p.style.bg, ink: p.style.ink })}
              style={{ background: p.style.bg, color: p.style.ink }}
            >
              <span aria-hidden="true">◐</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <details className="style-fine-tuning">
        <summary>Adjust colors</summary>
        {(['bg', 'ink'] as const).map((key) => (
          <label className="color-field" key={key}>
            <span>{key === 'bg' ? 'Paper color' : 'Ink color'}</span>
            <input
              type="color"
              aria-label={key === 'bg' ? 'Paper color' : 'Ink color'}
              value={d[key]}
              onChange={(e) => choose({ [key]: e.currentTarget.value })}
            />
            <span>{d[key]}</span>
          </label>
        ))}
      </details>
      <ChoiceGrid
        label="Background styles"
        choices={[
          {
            id: 'none',
            label: 'Plain',
            selected: d.backdrop === 'none',
            choose: () => choose({ backdrop: 'none' }),
            sample: <span className="background-study" style={{ background: d.bg }} />,
          },
          {
            id: 'gradient',
            label: 'Gradient',
            selected: d.backdrop === 'gradient',
            choose: () => choose({ backdrop: 'gradient' }),
            sample: <span className="background-study" style={{ background: gradientCss(d) }} />,
          },
          {
            id: 'drift',
            label: 'Drift',
            selected: d.backdrop === 'drift',
            choose: () => choose({ backdrop: 'drift' }),
            sample: (
              <span
                className="background-study"
                style={{ background: 'linear-gradient(120deg,#ffffff,#d9d9d9,#f2efe9,#c9ccd2)' }}
              />
            ),
          },
          {
            id: 'shader',
            label: 'Shader',
            selected: d.backdrop === 'shader',
            choose: () => choose({ backdrop: 'shader' }),
            sample: (
              <span
                className="background-study"
                style={{ background: 'radial-gradient(at 30% 20%,#dccdbc,#becbd2)' }}
              />
            ),
          },
          ...(d.backdropSrc
            ? [
                {
                  id: 'image',
                  label: 'Your image',
                  selected: d.backdrop === 'image',
                  choose: () => choose({ backdrop: 'image' }),
                  sample: <img className="background-study" src={d.backdropSrc} alt="" />,
                },
              ]
            : []),
        ]}
      />
      {d.backdrop === 'gradient' && (
        <div className="gradient-controls">
          <div className="control-options" aria-label="Gradient presets">
            {GRADIENTS.map((p) => (
              <button
                key={p.name}
                onClick={() =>
                  ctl.setDraft({ backgroundFrom: p.from, backgroundVia: p.via, backgroundTo: p.to })
                }
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="gradient-colors">
            {(['backgroundFrom', 'backgroundVia', 'backgroundTo'] as const).map((key, i) => (
              <label key={key}>
                <span>{['Start', 'Middle', 'End'][i]}</span>
                <input
                  type="color"
                  aria-label={`Gradient ${['start', 'middle', 'end'][i]} color`}
                  value={d[key] || GRADIENT_DEFAULTS[key]}
                  onChange={(e) => ctl.setDraft({ [key]: e.currentTarget.value })}
                />
              </label>
            ))}
          </div>
          <label className="background-field">
            <span className="eyebrow">Direction · {d.backgroundAngle ?? 180}°</span>
            <input
              aria-label="Gradient angle"
              type="range"
              min="0"
              max="360"
              value={d.backgroundAngle ?? 180}
              onChange={(e) => ctl.setDraft({ backgroundAngle: Number(e.currentTarget.value) })}
            />
          </label>
          <label className="background-motion">
            <input
              type="checkbox"
              checked={!!d.backgroundMotion}
              onChange={(e) => ctl.setDraft({ backgroundMotion: e.currentTarget.checked })}
            />
            Let it move, slowly
          </label>
        </div>
      )}
      <div className="control-field">
        <div className="eyebrow">Paper</div>
        <div className="control-options">
          <button aria-pressed={d.paper === 'full'} onClick={() => ctl.setDraft({ paper: 'full' })}>
            Full page
          </button>
          <button aria-pressed={d.paper === 'card'} onClick={() => ctl.setDraft({ paper: 'card' })}>
            Floating sheet
          </button>
        </div>
      </div>
      <label className="attach-button">
        + Background image
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0]
            if (file) ctl.pickBackdropImage(file)
            e.currentTarget.value = ''
          }}
        />
      </label>
    </>
  )
}
