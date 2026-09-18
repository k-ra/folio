import type { ChatMessage, CustomStyleCategory, Style } from '../model/types.js'
import { BACKGROUND_CODE_LIMIT, gradientCss } from './backgrounds.js'

export const STYLE_CATEGORIES = ['graphics', 'data', 'palette', 'page'] as const
export interface StyleRequest {
  category: CustomStyleCategory
  instruction: string
  history: ChatMessage[]
  current: { direction: string; background: string; ink: string; css: string }
}
export interface StyleResult {
  name: string
  direction: string
  reply: string
  background: string
  ink: string
  css: string
  sample: string
}
const text = (s: unknown, max: number): s is string => typeof s === 'string' && s.length <= max
const color = (s: unknown) => typeof s === 'string' && /^#[\da-f]{6}$/i.test(s)
export function validStyleRequest(value: unknown): value is StyleRequest {
  if (!value || typeof value !== 'object') return false
  const r = value as StyleRequest
  return (
    STYLE_CATEGORIES.includes(r.category) &&
    text(r.instruction, 3000) &&
    !!r.instruction.trim() &&
    Array.isArray(r.history) &&
    r.history.length <= 16 &&
    r.history.every((m) => m && typeof m.me === 'boolean' && text(m.text, 6000)) &&
    !!r.current &&
    text(r.current.direction, 6000) &&
    color(r.current.background) &&
    color(r.current.ink) &&
    text(r.current.css, BACKGROUND_CODE_LIMIT)
  )
}
export function validStyleResult(value: unknown, category: CustomStyleCategory): value is StyleResult {
  if (!value || typeof value !== 'object') return false
  const r = value as StyleResult
  return (
    text(r.name, 60) &&
    !!r.name.trim() &&
    text(r.direction, 6000) &&
    !!r.direction.trim() &&
    text(r.reply, 6000) &&
    !!r.reply.trim() &&
    color(r.background) &&
    color(r.ink) &&
    text(r.css, BACKGROUND_CODE_LIMIT) &&
    (category !== 'page' || !!r.css.trim()) &&
    text(r.sample, 80000) &&
    (!['graphics', 'data'].includes(category) || !!r.sample.trim())
  )
}
export function styleContext(style: Style, category: CustomStyleCategory): StyleRequest['current'] {
  return {
    direction:
      category === 'graphics'
        ? style.graphicDirection
        : category === 'data'
          ? style.dataDirection || `${style.chartStyle} chart with ${style.strokeWidth}px strokes`
          : category === 'page'
            ? style.backdrop === 'custom'
              ? style.backgroundPrompt || ''
              : `${style.backdrop} background`
            : style.customStyles?.palette?.direction || '',
    background: style.bg,
    ink: style.ink,
    css:
      category === 'page' || category === 'palette'
        ? style.backdrop === 'custom'
          ? style.backgroundCode || ''
          : style.backdrop === 'gradient'
            ? `body{background:${gradientCss(style)}}`
            : ''
        : '',
  }
}
/** A model can only change the chosen category; writing and unrelated settings never enter the patch. */
export function styleResultPatch(
  style: Style,
  category: CustomStyleCategory,
  instruction: string,
  result: StyleResult,
): Partial<Style> {
  if (!validStyleResult(result, category)) throw new Error('The style response was incomplete. Please retry.')
  const history: ChatMessage[] = [
    ...(style.customStyles?.[category]?.history || []).slice(-14),
    { me: true, text: instruction },
    { me: false, text: result.reply },
  ]
  return {
    ...(category === 'graphics'
      ? { graphicDirection: result.direction }
      : category === 'data'
        ? { dataDirection: result.direction }
        : category === 'palette'
          ? {
              bg: result.background,
              ink: result.ink,
              ...(result.css.trim()
                ? {
                    backdrop: 'custom' as const,
                    backgroundCode: result.css,
                    backgroundPrompt: result.direction,
                  }
                : {}),
            }
          : { backdrop: 'custom', backgroundCode: result.css, backgroundPrompt: result.direction }),
    customStyles: {
      ...style.customStyles,
      [category]: { name: result.name, direction: result.direction, history, sample: result.sample },
    },
  }
}
