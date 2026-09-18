import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { imageStudy } from '../src/model/imageStudies.js'
import type { Style } from '../src/model/types.js'

/** Only catalog-allowlisted assets can be read; no client path or URL is accepted. */
export async function imageStyleReference(style: Style, root: string) {
  const study = imageStudy(style)
  if (!study?.reference) return []
  let bytes: Buffer
  try {
    bytes = await readFile(resolve(root, 'src/assets/image-studies', `${study.id}.webp`))
  } catch {
    throw new Error(
      'The selected image style reference is unavailable. Restore its asset or choose another style.',
    )
  }
  return [
    {
      type: 'input_text',
      text: `Folio style reference: ${study.label}. Borrow its palette, texture and mark-making only—not its subject, composition or lettering. The user's prompt defines the subject; this is not the image to edit.`,
    },
    { type: 'input_image', image_url: `data:image/webp;base64,${bytes.toString('base64')}` },
  ]
}
