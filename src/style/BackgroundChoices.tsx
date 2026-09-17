import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../ai/session'
import type { Style } from '../model/types'
import type { WriteCtl } from '../write/ctl'
import AutoTextarea from '../ui/AutoTextarea'
import ChoiceGrid from './ChoiceGrid'
import {
  BACKGROUND_CODE_LIMIT,
  GRADIENT_DEFAULTS,
  GRADIENTS,
  STARTER_BACKGROUND,
  gradientCss,
  validBackgroundResult,
} from './backgrounds'
import './backgrounds.css'

export default function BackgroundChoices({ ctl }: { ctl: WriteCtl }) {
  const d = ctl.draft || ctl.S
  const [customOpen, setCustomOpen] = useState(d.backdrop === 'custom')
  const [prompt, setPrompt] = useState(d.backgroundPrompt || '')
  const [code, setCode] = useState(d.backgroundCode || STARTER_BACKGROUND)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    request.current?.abort()
    setPending(false)
    setError('')
    setCode(d.backgroundCode || STARTER_BACKGROUND)
    setPrompt(d.backgroundPrompt || '')
    setCustomOpen(d.backdrop === 'custom')
    return () => request.current?.abort()
  }, [d])

  const generate = async () => {
    if (!prompt.trim() || pending) return
    const abort = new AbortController()
    request.current = abort
    setPending(true)
    setError('')
    try {
      const response = await apiFetch('/api/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, background: d.bg, ink: d.ink, previous: d.backgroundCode || '' }),
        signal: abort.signal,
      })
      const result: unknown = await response.json()
      if (!response.ok)
        throw new Error((result as { error?: string })?.error || 'Background generation did not finish.')
      if (!validBackgroundResult(result))
        throw new Error(
          'The generator returned an incomplete background. Your current background is unchanged.',
        )
      if (!abort.signal.aborted)
        ctl.setDraft({ backdrop: 'custom', backgroundCode: result.css, backgroundPrompt: prompt })
    } catch (cause) {
      if (!abort.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : 'Could not connect. Your current background is unchanged.',
        )
    } finally {
      if (request.current === abort) {
        request.current = null
        setPending(false)
      }
    }
  }

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
            detail: 'Describe it or write it',
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
          <label className="background-field">
            <span className="eyebrow">Describe the background</span>
            <AutoTextarea
              aria-label="Background direction"
              maxLength={3000}
              disabled={pending}
              value={prompt}
              onChange={(e) => setPrompt(e.currentTarget.value)}
              placeholder="A soft tide of blue and warm sand. Still enough to read on…"
            />
          </label>
          <div className="background-actions">
            <button disabled={pending || !prompt.trim() || !ctl.magic.connected} onClick={generate}>
              {pending ? 'Writing the background…' : 'Generate background'}
            </button>
            {pending && (
              <button
                onClick={() => {
                  request.current?.abort()
                  setPending(false)
                }}
              >
                Cancel
              </button>
            )}
          </div>
          <p className="control-help">
            {ctl.magic.connected
              ? 'Uses the connected text model. Only Generate makes a model request; Apply keeps the result.'
              : 'GPT generation needs the server connection. You can still write or paste CSS below.'}
          </p>
          {error && (
            <p className="background-error" role="alert">
              {error}
            </p>
          )}
          <details className="background-code">
            <summary>Edit the CSS</summary>
            <textarea
              aria-label="Background CSS"
              spellCheck={false}
              disabled={pending}
              value={code}
              maxLength={BACKGROUND_CODE_LIMIT}
              onChange={(e) => setCode(e.currentTarget.value)}
            />
            <button
              disabled={pending || !code.trim()}
              onClick={() =>
                ctl.setDraft({ backdrop: 'custom', backgroundCode: code, backgroundPrompt: prompt })
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
