import type { ChatMessage, FancyParams, Style } from '../model/types.js'

export type FancyStyle = Required<FancyParams>
export const DEFAULT_FANCY: FancyStyle = {
  size: 30,
  align: 'left',
  font: 'body',
  italic: false,
  pad: 30,
  ls: 0,
  weight: 400,
  lineHeight: 1.3,
  transform: 'none',
  color: 'inherit',
  motion: 'none',
  duration: 16,
  direction: 'left',
}

const enums = {
  align: ['left', 'center', 'right'],
  font: [
    'body',
    'header',
    'mono',
    'Instrument Sans',
    'Libre Caslon Text',
    'Newsreader',
    'Archivo',
    'IBM Plex Mono',
  ],
  transform: ['none', 'uppercase', 'lowercase'],
  motion: ['none', 'marquee', 'float', 'reveal'],
  direction: ['left', 'right'],
}
const ranges = {
  size: [12, 96],
  pad: [0, 120],
  ls: [-2, 12],
  weight: [100, 900],
  lineHeight: [0.9, 2.4],
  duration: [4, 60],
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const validField = (key: string, value: unknown) => {
  if (key in enums) return typeof value === 'string' && enums[key as keyof typeof enums].includes(value)
  if (key in ranges) {
    const [min, max] = ranges[key as keyof typeof ranges]
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
  }
  return key === 'italic'
    ? typeof value === 'boolean'
    : key === 'color' && typeof value === 'string' && /^(inherit|#[\da-f]{6})$/i.test(value)
}

/** Old six-field typography remains valid; render only bounded, known properties. */
export function fancyStyle(params: FancyParams): FancyStyle {
  return Object.fromEntries(
    Object.entries(DEFAULT_FANCY).map(([key, fallback]) => {
      const value = (params as unknown as Record<string, unknown>)[key]
      return [key, validField(key, value) ? value : fallback]
    }),
  ) as unknown as FancyStyle
}
export function validFancyStyle(value: unknown): value is FancyStyle {
  return (
    object(value) &&
    Object.keys(value).length === Object.keys(DEFAULT_FANCY).length &&
    Object.keys(DEFAULT_FANCY).every((key) => validField(key, value[key]))
  )
}
export interface FancyResult {
  fancy: FancyStyle
  reply: string
}
export function validFancyResult(value: unknown): value is FancyResult {
  return (
    object(value) &&
    Object.keys(value).length === 2 &&
    validFancyStyle(value.fancy) &&
    typeof value.reply === 'string' &&
    !!value.reply.trim() &&
    value.reply.length <= 6000
  )
}
export interface FancyRequest {
  text: string
  instruction: string
  previous: FancyStyle
  history: ChatMessage[]
  style: Pick<Style, 'bodyFont' | 'headerFont' | 'ink' | 'bg' | 'size'>
}
export function validFancyRequest(value: unknown): value is FancyRequest {
  if (!object(value) || !object(value.style)) return false
  const style = value.style
  return (
    typeof value.text === 'string' &&
    !!value.text.trim() &&
    value.text.length <= 20000 &&
    typeof value.instruction === 'string' &&
    !!value.instruction.trim() &&
    value.instruction.length <= 3000 &&
    validFancyStyle(value.previous) &&
    Array.isArray(value.history) &&
    value.history.length <= 16 &&
    value.history.every(
      (m) => object(m) && typeof m.me === 'boolean' && typeof m.text === 'string' && m.text.length <= 6000,
    ) &&
    typeof value.style.bodyFont === 'string' &&
    enums.font.includes(value.style.bodyFont) &&
    typeof value.style.headerFont === 'string' &&
    enums.font.includes(value.style.headerFont) &&
    typeof value.style.size === 'number' &&
    Number.isFinite(value.style.size) &&
    value.style.size > 0 &&
    value.style.size <= 200 &&
    ['ink', 'bg'].every((k) => typeof style[k] === 'string' && /^#[\da-f]{6}$/i.test(style[k] as string))
  )
}

export const fancySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['fancy', 'reply'],
  properties: {
    fancy: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(DEFAULT_FANCY),
      properties: {
        ...Object.fromEntries(
          Object.entries(enums).map(([key, values]) => [key, { type: 'string', enum: values }]),
        ),
        ...Object.fromEntries(Object.keys(ranges).map((key) => [key, { type: 'number' }])),
        italic: { type: 'boolean' },
        color: { type: 'string' },
      },
    },
    reply: { type: 'string' },
  },
}
