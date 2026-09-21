import type { Story } from './types'

/** Only adjacent plain paragraphs merge. Both notes and conversations remain recoverable. */
export function mergeParagraph(story: Story, id: string) {
  const index = story.blocks.findIndex((b) => b.id === id)
  const block = story.blocks[index],
    previous = story.blocks[index - 1]
  if (block?.type !== 'text' || previous?.type !== 'text') return null
  const notes = { ...story.notes },
    chats = { ...story.chats }
  if (id in notes) {
    notes[previous.id] = [notes[previous.id], notes[id]].filter(Boolean).join('\n\n')
    delete notes[id]
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
      blocks: story.blocks.flatMap((b) =>
        b.id === id ? [] : [b.id === previous.id ? { ...previous, text: previous.text + block.text } : b],
      ),
    },
  }
}
