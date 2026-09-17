import { DEF_STYLE, THUMBS } from './constants'
import type { Story, Style, ThumbKind } from './types'

const SAMPLE_THUMBS: Record<string, ThumbKind> = {
  's-notebook': 'lines',
  's-patterns': 'bars',
  's-colors': 'gradient',
  's-night': 'aa',
  's-fieldguide': 'mono',
}

// Recognize the exact earlier built-in image gradient when upgrading it to
// editable stops. Never convert a user's uploaded image or restyled sample.
const TIDE_BACKDROP =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tide" x2="0" y2="1"><stop stop-color="#e9cdb8"/><stop offset=".7" stop-color="#98ad9a"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#tide)"/></svg>',
  )

/** Fresh, editable styles for the built-in samples and disposable playground. */
export function sampleStyle(id: string): Style | undefined {
  const thumb = SAMPLE_THUMBS[id]
  if (!thumb) return undefined
  const appearance = THUMBS[thumb]
  return {
    ...DEF_STYLE,
    ink: appearance.ink,
    bg: thumb === 'gradient' ? '#98ad9a' : appearance.bg,
    ...(thumb === 'gradient'
      ? {
          backdrop: 'gradient' as const,
          backgroundFrom: '#e9cdb8',
          backgroundVia: '#bec4ad',
          backgroundTo: '#98ad9a',
          backgroundAngle: 180,
          backgroundMotion: false,
        }
      : {}),
  }
}

/**
 * Older samples had styled covers but default writing pages. Upgrade only that
 * exact untouched appearance, never a user's restyle (including Reset to Folio).
 * Text edits do not disqualify a sample, and history snapshots stay verbatim.
 */
export function migrateSampleAppearance(
  story: Story,
  style: Style,
): Pick<Story, 'style' | 'sampleStyleVersion'> {
  if (!SAMPLE_THUMBS[story.id]) return { style }
  if (story.sampleStyleVersion !== undefined) {
    if (
      story.id === 's-colors' &&
      story.sampleStyleVersion === 1 &&
      style.backdrop === 'image' &&
      style.backdropSrc === TIDE_BACKDROP
    ) {
      const tide = sampleStyle('s-colors')!
      return {
        style: {
          ...style,
          backdrop: tide.backdrop,
          backdropSrc: null,
          backgroundFrom: tide.backgroundFrom,
          backgroundVia: tide.backgroundVia,
          backgroundTo: tide.backgroundTo,
          backgroundAngle: 180,
          backgroundMotion: false,
        },
        sampleStyleVersion: 2,
      }
    }
    return { style }
  }
  // Remember every evaluated sample, including custom styles. History is capped
  // at 60 entries and cannot permanently protect a later explicit reset.
  const evaluated = { style, sampleStyleVersion: 2 }
  if (SAMPLE_THUMBS[story.id] !== story.thumb || story.history?.some((v) => v.label === 'Restyled'))
    return evaluated
  const originalInk = style.ink === DEF_STYLE.ink || style.ink === '#2a2622'
  const unchanged = (Object.keys(DEF_STYLE) as (keyof Style)[]).every(
    (key) => key === 'ink' || style[key] === DEF_STYLE[key],
  )
  return { ...evaluated, style: originalInk && unchanged ? (sampleStyle(story.id) ?? style) : style }
}
