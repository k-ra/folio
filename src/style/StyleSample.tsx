import { FONTS } from '../model/constants'
import type { Style } from '../model/types'
import ArtifactView from '../magic/ArtifactView'
import CustomBackground from './CustomBackground'
import { gradientCss } from './backgrounds'
import { imageStudy } from './imageStudies'

export default function StyleSample({ style, miniature = false }: { style: Style; miniature?: boolean }) {
  const study = imageStudy(style)
  const preview = study?.preview
  return (
    <div
      className={`style-sample ${miniature ? 'miniature' : ''}`}
      style={{
        position: 'relative',
        isolation: 'isolate',
        background: style.backdrop === 'gradient' && style.paper === 'full' ? gradientCss(style) : style.bg,
        color: style.ink,
        fontFamily: FONTS[style.bodyFont],
      }}
      aria-label="Live style sample"
    >
      {style.backdrop === 'custom' && style.paper === 'full' && style.backgroundCode && (
        <div style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
          <CustomBackground code={style.backgroundCode} fallback={style.bg} />
        </div>
      )}
      <div className="sample-kicker">FOLIO / A STUDY IN SMALL THINGS</div>
      <h3 style={{ fontFamily: FONTS[style.headerFont] }}>A line becomes a story.</h3>
      {!miniature && (
        <p
          style={{
            fontSize: Math.min(16, style.size),
            marginBottom: style.gap / 2,
          }}
        >
          A thought, an image, a little evidence.{' '}
          <span className={`sample-link link-${style.linkStyle}`}>Room to make it yours.</span>
        </p>
      )}
      <div className="sample-visuals">
        {preview ? (
          <img
            className="sample-illustration sample-image-reference"
            src={preview}
            alt={`${study!.label} style reference`}
            width="640"
            height="640"
            decoding="async"
          />
        ) : (
          <svg
            viewBox="0 0 120 130"
            aria-label="Image treatment sample"
            className={`sample-illustration image-${style.imageStyle}`}
          >
            <circle
              cx="70"
              cy="40"
              r="22"
              fill={style.imageStyle === 'natural' ? 'currentColor' : 'none'}
              fillOpacity=".14"
              stroke="currentColor"
              strokeWidth={style.strokeWidth}
            />
            {Array.from({ length: style.imageStyle === 'grain' ? 16 : 7 }, (_, i) => (
              <path
                key={i}
                d={`M5 ${98 + i * 3} Q40 ${20 + i * 9} 65 ${79 + i * 4} T120 ${67 + i * 5}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={style.strokeWidth}
                opacity={style.imageStyle === 'grain' ? 0.4 : 0.8}
              />
            ))}
          </svg>
        )}
        <ArtifactView
          compact
          style={style}
          output={{
            kind: 'chart',
            chartStyle: style.chartStyle,
            points: [14, 30, 24, 48, 40, 62].map((value, i) => ({
              label: String(i + 1),
              value,
            })),
            caption: 'Style specimen',
            xLabel: 'Day',
            yLabel: 'Value',
          }}
        />
      </div>
      {!miniature && <div className="sample-footnote">01 — TEXT, IMAGE & DATA IN CONVERSATION</div>}
    </div>
  )
}
