import type { MagicMode, Style } from '../model/types'

export const LOADING_STYLES: { id: Style['loading']; name: string; description: string }[] = [
  { id: 'contour', name: 'Contour', description: 'A drawing finding its shape.' },
  { id: 'weave', name: 'Weave', description: 'Fine lines filling the whole field.' },
  { id: 'script', name: 'Written', description: 'An idea writing itself in space.' },
]

export default function Loading({
  treatment,
  mode = 'graphics',
  compact = false,
  height,
}: {
  treatment: Style['loading']
  mode?: MagicMode
  compact?: boolean
  height?: number
}) {
  return (
    <div
      className={`magic-loading loading-${treatment} ${compact ? 'compact' : ''}`}
      style={height ? { height } : undefined}
      role="status"
      aria-label="Creating artifact"
    >
      <svg viewBox="0 0 560 280" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        {treatment === 'contour' &&
          Array.from({ length: 19 }, (_, i) => (
            <path
              key={i}
              pathLength="1"
              style={{ animationDelay: `${i * 0.075}s` }}
              d={`M${-50 + i * 3} ${185 + i * 4} C${90 + i * 3} ${225 - i * 11} ${240 - i * 3} ${-45 + i * 5} 310 ${100 + i * 5} S${470 + i * 4} ${300 - i * 7} 620 ${60 + i * 8}`}
            />
          ))}
        {treatment === 'weave' &&
          Array.from({ length: 45 }, (_, i) => (
            <path
              key={i}
              pathLength="1"
              style={{ animationDelay: `${i * 0.045}s` }}
              d={`M${i * 22 - 250} 0 L${i * 22 + 50} 280`}
            />
          ))}
        {treatment === 'script' && (
          <>
            <path
              className="written-stroke"
              pathLength="1"
              d="M80 164 C124 30 138 47 102 142 S90 189 137 126 C173 84 161 170 135 154 C110 139 178 96 168 140 S190 172 214 117 C226 85 207 173 228 149 L280 110 C300 96 273 142 264 151 C220 203 309 85 316 109 C327 141 279 191 292 142 C304 104 334 165 350 145 C390 96 382 113 365 148 S401 166 438 113"
            />
            <path className="written-underline" pathLength="1" d="M102 204 Q281 177 460 194" />
          </>
        )}
      </svg>
      {!compact && (
        <div className="loading-caption">
          <span className="loading-dot" />
          {mode === 'image'
            ? 'Finding the image'
            : mode === 'data'
              ? 'Drawing the connections'
              : 'Giving your idea a shape'}
          <span className="loading-ellipsis">…</span>
        </div>
      )}
    </div>
  )
}
