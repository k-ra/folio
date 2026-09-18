import type { Style } from './types.js'

interface ImageStudy {
  id: string
  label: string
  treatment: Style['imageStyle']
  direction: string
  reference?: true
  legacyDirection?: string
}

/** Shared, asset-free catalog for the UI, saved styles and server-side reference selection. */
export const IMAGE_STUDIES: ImageStudy[] = [
  {
    id: 'cobalt-atlas',
    label: 'Cobalt atlas',
    treatment: 'natural',
    direction: 'Cobalt engraving on warm ivory; fine stippling and generous space.',
    legacyDirection:
      'A single deep cobalt ink on warm ivory paper. Delicate engraved strokes and stippled shading, a clear specimen-like silhouette and generous negative space. Interpret the requested subject, not a fixed shell or moon motif. Standalone artwork unless a comparison is requested. Use only meaningful, accurate structure when the user asks for a diagram; never invent measurements or annotations.',
    reference: true,
  },
  {
    id: 'garden-press',
    label: 'Garden press',
    treatment: 'natural',
    direction: 'Waxy crayon and oil pastel on fibrous paper, with rough-edged collage accents.',
    legacyDirection:
      'Waxy crayon and oil-pastel illustration on warm fibrous paper, broken pigment, lively organic silhouettes and a few rough-edged colored paper fragments. Use a small rich palette appropriate to the requested subject. Keep material contrast and breathing room. Standalone artwork, not a mandatory photograph-and-illustration split. The subject comes from the prompt, not a fixed fruit motif.',
    reference: true,
  },
  {
    id: 'coastal-halftone',
    label: 'Coastal halftone',
    treatment: 'natural',
    direction: 'Charcoal and warm-accent halftone on ivory; varied dots, bold silhouettes and open paper.',
    legacyDirection:
      'A two-ink halftone print on pale warm paper: charcoal structure and a warm accent for light. Build tone from varying dot density and scale; preserve the focal silhouette and simplify secondary detail into atmospheric fields. Leave untouched paper. Use dots, not letter-shaped marks. Interpret any requested subject; do not insert a coast or lighthouse unless requested. Standalone artwork unless a comparison is requested.',
    reference: true,
  },
  {
    id: 'mist-print',
    label: 'Mist print',
    treatment: 'natural',
    direction: 'Quiet blue-grey printmaking on ivory; misty layers, fine stippling and sparse accents.',
    legacyDirection:
      'Quiet printmaking on warm ivory paper, muted blue-grey and charcoal, fine stippling and large overlapping shapes that suggest mist and depth. Sparse accent color, an asymmetric focal subject and generous negative space. Preserve the requested subject and its relationships; do not insert birds, reeds or calligraphy merely because this is a print treatment. Standalone artwork unless a comparison is requested.',
    reference: true,
  },
  {
    id: 'spring-contours',
    label: 'Spring contours',
    treatment: 'natural',
    reference: true,
    direction: 'Delicate sage and peach contour lines on white fibrous paper; airy, worn print texture.',
  },
  {
    id: 'signal-city',
    label: 'Signal city',
    treatment: 'natural',
    reference: true,
    direction:
      'Fine graphite isometric contours on icy blue; flowing geometry and a single electric-yellow accent.',
  },
  {
    id: 'water-ink',
    label: 'Water ink',
    treatment: 'natural',
    reference: true,
    direction: 'Pale blue-green ink wash, watery pigment blooms and mist-soft edges on spacious white paper.',
  },
  {
    id: 'citrus-sketch',
    label: 'Citrus sketch',
    treatment: 'natural',
    reference: true,
    direction: 'Loose black pen and sunlit watercolor; lemon yellow, olive and sea blue on warm ivory.',
  },
  { id: 'folio', label: 'Folio', treatment: 'linework', direction: '' },
  {
    id: 'etching',
    label: 'Etching',
    treatment: 'linework',
    direction: 'Fine etched strokes and crosshatching, black ink on warm paper.',
  },
  { id: 'grain', label: 'Grain', treatment: 'grain', direction: '' },
  {
    id: 'cutpaper',
    label: 'Cut paper',
    treatment: 'natural',
    direction: 'Layered cut-paper shapes, restrained colors, gentle paper shadows.',
  },
  { id: 'natural', label: 'Natural', treatment: 'natural', direction: '' },
  {
    id: 'softlight',
    label: 'Soft light',
    treatment: 'natural',
    direction: 'Quiet photographic light, soft shadows, hazy atmosphere and muted colors.',
  },
]

export const imageStudy = (style: Style) =>
  IMAGE_STUDIES.find(
    (p) =>
      style.imageStyle === p.treatment &&
      (style.imageDirection === p.direction ||
        (p.legacyDirection !== undefined && style.imageDirection === p.legacyDirection)),
  )

/** Only exact built-in wording is shortened. Never rewrite a user's custom direction or history. */
export function normalizeImageDirection(style: Style): Style {
  const study = imageStudy(style)
  return study && study.direction !== style.imageDirection
    ? { ...style, imageDirection: study.direction }
    : style
}

export const imageStyleLabel = (style: Style) => imageStudy(style)?.label || `Custom ${style.imageStyle}`
