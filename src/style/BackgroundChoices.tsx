import { useEffect, useState } from 'react'
import type { Style } from '../model/types'
import type { WriteCtl } from '../write/ctl'
import ChoiceGrid from './ChoiceGrid'
import {
  BACKGROUND_CODE_LIMIT,
  GRADIENT_DEFAULTS,
  GRADIENTS,
  STARTER_BACKGROUND,
  gradientCss,
} from './backgrounds'
import './backgrounds.css'

export default function BackgroundChoices({ ctl }: { ctl: WriteCtl }) {
  const d = ctl.draft || ctl.S
  const [customOpen, setCustomOpen] = useState(d.backdrop === 'custom')
  const [code, setCode] = useState(d.backgroundCode || STARTER_BACKGROUND)
  useEffect(() => {
    setCode(d.backgroundCode || STARTER_BACKGROUND)
    setCustomOpen(d.backdrop === 'custom')
  }, [d])

  const choose = (patch: Partial<Style>) => {
    setCustomOpen(false)
    ctl.setDraft(patch)
  }
  return (
    <>
      <ChoiceGrid
        label="Background styles"
        choices={[
          {
            id: 'none',
            label: 'Plain',
            selected: d.backdrop === 'none' && !customOpen,
            choose: () => choose({ backdrop: 'none' }),
            sample: <span className="background-study" style={{ background: d.bg }} />,
          },
          {
            id: 'gradient',
            label: 'Gradient',
            selected: d.backdrop === 'gradient' && !customOpen,
            choose: () => choose({ backdrop: 'gradient' }),
            sample: <span className="background-study" style={{ background: gradientCss(d) }} />,
          },
          {
            id: 'drift',
            label: 'Drift',
            selected: d.backdrop === 'drift' && !customOpen,
            choose: () => choose({ backdrop: 'drift' }),
            sample: (
              <span
                className="background-study"
                style={{ background: 'linear-gradient(120deg,#ffffff,#d9d9d9,#f2efe9,#c9ccd2)' }}
              />
            ),
          },
          {
            id: 'custom',
            label: 'Custom code',
            detail: 'Write or inspect CSS',
            selected: customOpen,
            choose: () => setCustomOpen(true),
            sample: <span className="background-study background-code-study">{'{ }'}</span>,
          },
          {
            id: 'shader',
            label: 'Shader',
            selected: d.backdrop === 'shader' && !customOpen,
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
                  selected: d.backdrop === 'image' && !customOpen,
                  choose: () => choose({ backdrop: 'image' }),
                  sample: <img className="background-study" src={d.backdropSrc} alt="" />,
                },
              ]
            : []),
        ]}
      />
      {d.backdrop === 'gradient' && !customOpen && (
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
      {customOpen && (
        <div className="custom-background-controls">
          <details className="background-code">
            <summary>Edit the CSS</summary>
            <textarea
              aria-label="Background CSS"
              spellCheck={false}
              value={code}
              maxLength={BACKGROUND_CODE_LIMIT}
              onChange={(e) => setCode(e.currentTarget.value)}
            />
            <button
              disabled={!code.trim()}
              onClick={() =>
                ctl.setDraft({ backdrop: 'custom', backgroundCode: code })
              }
            >
              Preview code
            </button>
            <p className="control-help">
              Style body and its ::before / ::after layers. No scripts or external resources. Reduced motion
              shows the plain paper color.
            </p>
          </details>
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
