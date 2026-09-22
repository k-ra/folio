import { z } from 'zod'
import type { Story } from '../model/types'

const text = z.string()
const color = text.regex(/^#[\da-f]{6}$/i)
const font = z.enum(['Instrument Sans', 'Libre Caslon Text', 'Newsreader', 'Archivo', 'IBM Plex Mono'])
const message = z.object({
  me: z.boolean(),
  text,
  focus: text.nullable().optional(),
})
const custom = z.object({
  name: text,
  direction: text,
  history: z.array(message),
  sample: text.optional(),
})
const style = z.object({
  bodyFont: font,
  headerFont: font,
  size: z.number().min(1).max(200),
  gap: z.number().min(0).max(1000),
  bg: color,
  ink: color,
  backdrop: z.enum(['none', 'gradient', 'custom', 'drift', 'shader', 'image']),
  backdropSrc: text.nullable(),
  paper: z.enum(['full', 'card']),
  strokeWidth: z.number(),
  chartStyle: z.enum(['line', 'bar', 'area']),
  imageStyle: z.enum(['linework', 'grain', 'natural']),
  imageDirection: text,
  imageModel: text,
  graphicDirection: text,
  linkStyle: z.enum(['underline', 'quiet', 'highlight']),
  loading: z.enum(['contour', 'weave', 'script']),
  backgroundFrom: color.optional(),
  backgroundVia: color.optional(),
  backgroundTo: color.optional(),
  backgroundAngle: z.number().optional(),
  backgroundMotion: z.boolean().optional(),
  backgroundCode: text.optional(),
  backgroundPrompt: text.optional(),
  dataDirection: text.optional(),
  imageBackground: z.enum(['opaque', 'transparent']).optional(),
  customStyles: z
    .object({
      graphics: custom.optional(),
      data: custom.optional(),
      palette: custom.optional(),
      page: custom.optional(),
    })
    .optional(),
})
const fancy = z.object({
  size: z.number(),
  align: z.enum(['left', 'center', 'right']),
  font: z.union([font, z.enum(['body', 'header', 'mono'])]),
  italic: z.boolean(),
  pad: z.number(),
  ls: z.number(),
  weight: z.number().optional(),
  lineHeight: z.number().optional(),
  transform: z.enum(['none', 'uppercase', 'lowercase']).optional(),
  color: text.optional(),
  motion: z.enum(['none', 'marquee', 'float', 'reveal']).optional(),
  duration: z.number().optional(),
  direction: z.enum(['left', 'right']).optional(),
})
const output = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('image'),
    src: text,
    caption: text,
    demo: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('html'),
    html: text,
    caption: text,
    demo: z.boolean().optional(),
    reply: text.optional(),
  }),
  z.object({
    kind: z.literal('chart'),
    points: z.array(z.object({ label: text, value: z.number() })),
    chartStyle: z.enum(['line', 'bar', 'area']),
    caption: text,
    xLabel: text,
    yLabel: text,
    demo: z.boolean().optional(),
  }),
])
const id = text.min(1).max(200)
const block = z.discriminatedUnion('type', [
  z.object({ id, type: z.literal('text'), text }),
  z.object({ id, type: z.literal('media'), src: text.nullable(), text }),
  z.object({ id, type: z.literal('padding'), h: z.number().min(0).max(10000) }),
  z.object({
    id,
    type: z.literal('fancy'),
    text,
    prompt: text,
    fancy,
    editDraft: text.optional(),
    status: z.enum(['idle', 'rendering', 'error']).optional(),
    requestId: text.optional(),
    error: text.optional(),
    revisions: z.array(z.object({ instruction: text, fancy })).optional(),
    revision: z.number().int().optional(),
  }),
  z.object({
    id,
    type: z.literal('graphic'),
    prompt: text,
    status: z.enum(['prompt', 'rendering', 'done']),
    data: z.array(text),
    inferred: z.boolean().optional(),
    caption: text,
    hatch: z.boolean(),
    thin: z.boolean(),
    renderKey: z.number().optional(),
  }),
  z.object({
    id,
    type: z.literal('magic'),
    mode: z.enum(['image', 'graphics', 'data']),
    layout: z.enum(['column', 'full-bleed']).optional(),
    provider: z.enum(['preview', 'connected']).optional(),
    imageBackground: z.enum(['opaque', 'transparent']).optional(),
    prompt: text,
    status: z.enum(['prompt', 'rendering', 'done', 'error']),
    attachments: z.array(
      z.object({
        id,
        name: text,
        kind: z.enum(['data', 'image']),
        content: text,
      }),
    ),
    revisions: z.array(
      z.object({
        id,
        sourceNames: z.array(text).optional(),
        instruction: text,
        output,
        style,
        provider: z.enum(['preview', 'connected']).optional(),
      }),
    ),
    revision: z.number().int(),
    editDraft: text.optional(),
    requestId: text.optional(),
    error: text.optional(),
  }),
])
const snapshot = z.object({
  formatting: z
    .record(
      text,
      z.array(
        z.object({
          from: z.number().int().nonnegative(),
          to: z.number().int().nonnegative(),
          kind: z.enum(['bold', 'italic', 'underline', 'strike', 'code']),
        }),
      ),
    )
    .optional(),
  title: text,
  blocks: z.array(block),
  style,
  notes: z.record(text, text),
  chats: z.record(text, z.array(message)).optional(),
  presets: z.array(z.object({ id, name: text, style })).optional(),
})
const schema = snapshot.extend({
  chats: z.record(text, z.array(message)),
  id,
  date: text,
  thumb: z.enum(['lines', 'bars', 'gradient', 'aa', 'mono', 'photo']),
  files: z.array(text).optional(),
  sources: z.array(z.object({ label: text, url: text })).optional(),
  sampleStyleVersion: z.number().optional(),
  history: z.array(z.object({ t: z.number(), label: text, words: z.number(), snap: text })).optional(),
})

/** Allowlisted structured data only: credentials/session metadata never travel with a story. */
export function cleanStory(value: unknown): Story {
  const story = schema.parse(value)
  const ids = new Set(story.blocks.map((b) => b.id))
  if (ids.size !== story.blocks.length) throw new Error('Duplicate block IDs in story.')
  const ordered = (raw: unknown, safe: unknown): unknown => {
    if (Array.isArray(safe)) return safe.map((v, i) => ordered((raw as unknown[])[i], v))
    if (safe && typeof safe === 'object')
      return Object.fromEntries(
        Object.keys(raw as object)
          .filter((k) => k in safe)
          .map((k) => [
            k,
            ordered((raw as Record<string, unknown>)[k], (safe as Record<string, unknown>)[k]),
          ]),
      )
    return safe
  }
  story.history = story.history?.map((v) => {
    const raw = JSON.parse(v.snap)
    return { ...v, snap: JSON.stringify(ordered(raw, snapshot.parse(raw))) }
  })
  return story as Story
}
