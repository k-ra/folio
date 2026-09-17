import type { ReactNode } from 'react'

export interface Choice {
  id: string
  label: string
  detail?: string
  sample: ReactNode
  selected: boolean
  choose: () => void
}

/** A quiet, reusable gallery: selection is a dot and a soft fill, never a frame. */
export default function ChoiceGrid({
  label,
  choices,
  presentation = 'gallery',
}: {
  label: string
  choices: Choice[]
  presentation?: 'gallery' | 'pills'
}) {
  return (
    <div
      className={`choice-grid${presentation === 'pills' ? ' choice-grid--pills' : ''}`}
      role="group"
      aria-label={label}
    >
      {choices.map((choice) => (
        <button
          key={choice.id}
          className="choice-card"
          aria-label={choice.label}
          aria-pressed={choice.selected}
          onClick={choice.choose}
        >
          <span className="choice-sample" aria-hidden="true">
            {choice.sample}
          </span>
          <span className="choice-name">
            {choice.label}
            <span aria-hidden="true">{choice.selected ? '●' : ''}</span>
          </span>
          {choice.detail && <small>{choice.detail}</small>}
        </button>
      ))}
    </div>
  )
}
