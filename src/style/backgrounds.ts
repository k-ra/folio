import type { Style } from '../model/types'

export const BACKGROUND_CODE_LIMIT = 24000
export const GRADIENT_DEFAULTS = {
  backgroundFrom: '#e9cdb8',
  backgroundVia: '#bec4ad',
  backgroundTo: '#98ad9a',
  backgroundAngle: 180,
  backgroundMotion: false,
}

export const GRADIENTS = [
  { name: 'Tide', from: '#e9cdb8', via: '#bec4ad', to: '#98ad9a' },
  { name: 'Daybreak', from: '#f8e6d9', via: '#e8dce8', to: '#bbcddd' },
  { name: 'Sea glass', from: '#dbe8e1', via: '#c5dadd', to: '#a5becd' },
]

export function gradientCss(style: Partial<Style>) {
  const color = (value: string | undefined, fallback: string) =>
    /^#[\da-f]{6}$/i.test(value || '') ? value : fallback
  const angle = Number.isFinite(style.backgroundAngle) ? Number(style.backgroundAngle) % 360 : 180
  return `linear-gradient(${angle}deg, ${color(style.backgroundFrom, GRADIENT_DEFAULTS.backgroundFrom)}, ${color(style.backgroundVia, GRADIENT_DEFAULTS.backgroundVia)} 50%, ${color(style.backgroundTo, GRADIENT_DEFAULTS.backgroundTo)})`
}

export const STARTER_BACKGROUND = `body {
  background: radial-gradient(ellipse at 20% 10%, #f4e1cf, transparent 65%),
              linear-gradient(160deg, #eef0e4, #b9ceca);
}`

/** No HTML or script is interpolated. CSP and the iframe's empty sandbox are the security boundary. */
export function backgroundDocument(code: string, fallback: string, reducedMotion = false) {
  const color = /^#[\da-f]{6}$/i.test(fallback) ? fallback : '#fdfbf6'
  // Escaping '<' prevents a pasted stylesheet from closing its style element.
  const css = code.slice(0, BACKGROUND_CODE_LIMIT).replace(/</g, '\\3c ')
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; img-src 'none'; connect-src 'none'; font-src 'none'; media-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}body{background:${color}}${reducedMotion ? '' : css}</style></head><body></body></html>`
}

export interface BackgroundResult {
  css: string
}
export function validBackgroundResult(value: unknown): value is BackgroundResult {
  if (!value || typeof value !== 'object') return false
  const css = (value as BackgroundResult).css
  return typeof css === 'string' && !!css.trim() && css.length <= BACKGROUND_CODE_LIMIT
}
