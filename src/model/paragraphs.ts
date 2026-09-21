import type { Story } from './types'
import { shiftMarks, withFormatting } from '../text/formatting'

/** Only adjacent plain paragraphs merge. Both notes and conversations remain recoverable. */
export function mergeParagraph(story: Story, id: string) {
  const index = story.blocks.findIndex((b) => b.id === id)
  const block = story.blocks[index],
    previous = story.blocks[index - 1]
  if (block?.type !== 'text' || previous?.type !== 'text') return null
  const notes = { ...story.notes },
    chats = { ...story.chats }
  const noteOffset = (notes[previous.id] || '').length + (notes[previous.id] && notes[id] ? 2 : 0)
  let formatting = withFormatting(story.formatting, previous.id, previous.text + block.text, [
    ...(story.formatting?.[previous.id] || []),
    ...shiftMarks(story.formatting?.[id], previous.text.length),
  ])
  formatting = withFormatting(formatting, id, '', [])
  if (id in notes) {
    notes[previous.id] = [notes[previous.id], notes[id]].filter(Boolean).join('\n\n')
    delete notes[id]
    formatting = withFormatting(formatting, 'n-' + previous.id, notes[previous.id], [
      ...(story.formatting?.['n-' + previous.id] || []),
      ...shiftMarks(story.formatting?.['n-' + id], noteOffset),
    ])
    formatting = withFormatting(formatting, 'n-' + id, '', [])
  }
  if (id in chats) {
    chats[previous.id] = [...(chats[previous.id] || []), ...chats[id]]
    delete chats[id]
  }
  return {
    caret: previous.text.length,
    target: previous.id,
    story: {
      ...story,
      notes,
      chats,
      formatting,
      blocks: story.blocks.flatMap((b) =>
        b.id === id ? [] : [b.id === previous.id ? { ...previous, text: previous.text + block.text } : b],
      ),
    },
  }
}
