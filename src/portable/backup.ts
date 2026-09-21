import type { Story } from '../model/types'
import { cleanStory } from './schema'

export const backup = (story: Story) =>
  JSON.stringify({ format: 'folio', version: 1, story: cleanStory(story) })
export function readBackup(raw: string): Story {
  if (raw.length > 200 * 1024 * 1024) throw new Error('This backup exceeds the 200 MB import limit.')
  const value = JSON.parse(raw)
  if (value.format !== 'folio' || value.version !== 1) throw new Error('Choose a version 1 .folio backup.')
  return cleanStory(value.story)
}
export const storyText = (s: Story) =>
  [
    s.title,
    ...s.blocks.map((b) => {
      if ('text' in b) return b.text
      if (b.type === 'magic') return b.revisions[b.revision]?.output.caption || ''
      return b.type === 'graphic' ? b.caption : ''
    }),
  ]
    .filter(Boolean)
    .join('\n\n')

export function download(data: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
export const filename = (s: Story) =>
  (s.title || 'Untitled').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80) || 'folio'
