import type { Style } from '../model/types'
import ChoiceGrid from './ChoiceGrid'

import { IMAGE_STUDIES, imageStudy } from './imageStudies'

/** Saved examples communicate direction; browsing never generates or uploads an image. */
export default function ImageChoices({
  style,
  change,
}: {
  style: Style
  change: (patch: Partial<Style>) => void
}) {
  return (
    <ChoiceGrid
      label="Image styles"
      presentation="pills"
      choices={IMAGE_STUDIES.map((p) => ({
        id: p.id,
        label: p.label,
        selected: imageStudy(style)?.id === p.id,
        choose: () => change({ imageStyle: p.treatment, imageDirection: p.direction }),
        sample: p.preview ? (
          <img src={p.preview} alt="" width="640" height="640" decoding="async" loading="lazy" />
        ) : (
          <ImageStudy kind={p.id} />
        ),
      }))}
    />
  )
}

function ImageStudy({ kind }: { kind: string }) {
  const line = kind === 'folio' || kind === 'etching'
  return (
    <svg viewBox="0 0 160 110" fill="none">
      <circle
        cx="112"
        cy="29"
        r="12"
        fill={line ? 'none' : 'currentColor'}
        fillOpacity=".12"
        stroke={line ? 'currentColor' : 'none'}
        strokeWidth=".7"
      />
      {line ? (
        <>
          <path
            d="M12 84 Q46 18 82 66 T150 56 M12 90 Q49 37 82 75 T150 68 M12 97 Q52 60 82 85 T150 81"
            stroke="currentColor"
            strokeWidth=".8"
          />
          {kind === 'etching' &&
            Array.from({ length: 24 }, (_, i) => (
              <path
                key={i}
                d={`M${15 + i * 5} 97 l-12 -${10 + Math.sin(i / 4) * 8}`}
                stroke="currentColor"
                strokeWidth=".5"
                opacity=".6"
              />
            ))}
        </>
      ) : kind === 'grain' ? (
        <>
          {Array.from({ length: 280 }, (_, i) => (
            <circle
              key={i}
              cx={12 + ((i * 37) % 138)}
              cy={45 + ((i * 19) % 55)}
              r={0.4 + (i % 3) * 0.3}
              fill="currentColor"
              opacity={0.12 + (i % 5) * 0.1}
            />
          ))}
          <path d="M12 84 Q46 18 82 66 T150 56" stroke="currentColor" strokeWidth="1" opacity=".5" />
        </>
      ) : (
        <>
          <path
            d="M0 87 Q40 26 90 65 T160 48 V110 H0Z"
            fill="currentColor"
            opacity={kind === 'softlight' ? '.08' : '.14'}
          />
          <path
            d="M0 98 Q54 61 100 83 T160 70 V110 H0Z"
            fill="currentColor"
            opacity={kind === 'cutpaper' ? '.3' : '.15'}
          />
          <path d="M0 106 Q74 81 160 95 V110 H0Z" fill="currentColor" opacity=".22" />
          {kind === 'natural' && (
            <path
              d="M50 89 V43 m0 12 -9 -7 m9 16 12 -9 m-12 19 -14 -9"
              stroke="currentColor"
              strokeWidth="1.1"
              opacity=".6"
            />
          )}
        </>
      )}
    </svg>
  )
}
