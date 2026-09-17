import { useId, useState } from 'react'
import type { ArtifactOutput, Style } from '../model/types'
import { FONTS } from '../model/constants'
import instrumentSans from '@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2?inline'

export function sandboxDocument(html: string) {
  // The iframe has an opaque origin. Generated scripts cannot reach the editor or the network.
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@font-face{font-family:'Instrument Sans';src:url('${instrumentSans}') format('woff2');font-weight:400}body{font-family:'Instrument Sans',sans-serif}</style></head><body>${html}</body></html>`
}

export default function ArtifactView({
  output,
  style,
  compact = false,
  fullBleed = false,
}: {
  output: ArtifactOutput
  style: Style
  compact?: boolean
  fullBleed?: boolean
}) {
  if (output.kind === 'image')
    return (
      <img
        className={`artifact-image image-${style.imageStyle}`}
        src={output.src}
        alt={output.caption}
        style={{ maxHeight: compact ? 120 : fullBleed ? undefined : 440 }}
      />
    )
  if (output.kind === 'html')
    return (
      <iframe
        className="artifact-frame"
        title={output.caption || 'Interactive artifact'}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        srcDoc={sandboxDocument(output.html)}
        style={{ height: compact ? 160 : fullBleed ? 'clamp(330px, 56.25cqw, 720px)' : 330 }}
      />
    )
  return <Chart output={output} style={style} compact={compact} />
}

function Chart({
  output,
  style,
  compact,
}: {
  output: Extract<ArtifactOutput, { kind: 'chart' }>
  style: Style
  compact: boolean
}) {
  const [active, setActive] = useState<number | null>(null)
  const uid = useId()
  const w = 560,
    h = compact ? 150 : 280,
    left = compact ? 4 : 44,
    bottom = h - 32,
    top = 22
  const max = Math.max(0, ...output.points.map((p) => p.value)),
    min = Math.min(0, ...output.points.map((p) => p.value))
  const range = max - min || 1,
    span = w - left - 20
  const y = (value: number) => bottom - ((value - min) / range) * (bottom - top)
  const x = (i: number) => left + ((i + 0.5) * span) / output.points.length
  const path = output.points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ')
  const item = active === null ? null : output.points[active]
  return (
    <div className="artifact-chart" style={{ fontFamily: FONTS[style.bodyFont] }}>
      {!compact && (
        <div className="chart-heading">
          <span>{output.yLabel}</span>
          <span aria-live="polite">{item ? `${item.label} · ${item.value}` : 'Hover or tab to explore'}</span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role={compact ? 'img' : 'group'}
        aria-labelledby={uid}
        style={{ color: style.ink }}
      >
        <title id={uid}>{output.caption}</title>
        {!compact &&
          [min, min + range / 2, max].map((v, i) => (
            <g key={i}>
              <line
                x1={left}
                x2={w - 20}
                y1={y(v)}
                y2={y(v)}
                stroke="currentColor"
                strokeWidth=".5"
                opacity=".12"
              />
              <text
                x={left - 10}
                y={y(v) + 4}
                textAnchor="end"
                fontSize="10"
                fill="currentColor"
                opacity=".5"
              >
                {Number(v.toFixed(1))}
              </text>
            </g>
          ))}
        <line x1={left} x2={w - 20} y1={y(0)} y2={y(0)} stroke="currentColor" strokeWidth=".5" opacity=".3" />
        {output.chartStyle === 'area' && (
          <path
            d={`${path} L${x(output.points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
            fill="currentColor"
            opacity=".1"
          />
        )}
        {output.chartStyle !== 'bar' && (
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={style.strokeWidth}
            strokeLinejoin="round"
          />
        )}
        {output.points.map((p, i) => (
          <g
            key={i}
            tabIndex={compact ? undefined : 0}
            role="img"
            aria-label={`${p.label}: ${p.value}`}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <title>
              {p.label}: {p.value}
            </title>
            {output.chartStyle === 'bar' ? (
              <rect
                x={x(i) - (span / output.points.length) * 0.3}
                y={Math.min(y(0), y(p.value))}
                width={(span / output.points.length) * 0.6}
                height={Math.max(0.7, Math.abs(y(0) - y(p.value)))}
                fill={active === i ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={style.strokeWidth}
              />
            ) : (
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={active === i ? 4 : 2}
                fill={style.bg}
                stroke="currentColor"
                strokeWidth={style.strokeWidth}
              />
            )}
            <rect
              x={x(i) - span / output.points.length / 2}
              y={top}
              width={span / output.points.length}
              height={bottom - top}
              fill="transparent"
            />
            {i % Math.max(1, Math.ceil(output.points.length / 6)) === 0 && (
              <text x={x(i)} y={h - 10} textAnchor="middle" fontSize="10" fill="currentColor" opacity=".5">
                {p.label.length > 12 ? p.label.slice(0, 10) + '…' : p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
