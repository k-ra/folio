import type { Style } from '../model/types'
import { IMAGE_STUDIES as catalog, imageStudy as findStudy } from '../model/imageStudies'
import cobaltAtlas from '../assets/image-studies/cobalt-atlas.webp'
import gardenPress from '../assets/image-studies/garden-press.webp'
import coastalHalftone from '../assets/image-studies/coastal-halftone.webp'
import mistPrint from '../assets/image-studies/mist-print.webp'

const previews: Record<string, string> = {
  'cobalt-atlas': cobaltAtlas,
  'garden-press': gardenPress,
  'coastal-halftone': coastalHalftone,
  'mist-print': mistPrint,
}

export const IMAGE_STUDIES = catalog.map((study) => ({ ...study, preview: previews[study.id] }))
export const imageStudy = (style: Style) => {
  const study = findStudy(style)
  return study ? IMAGE_STUDIES.find((p) => p.id === study.id) : undefined
}
export { imageStyleLabel } from '../model/imageStudies'
