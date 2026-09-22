import type { Story } from './types'
/** Conversation is a separate timeline, never an undoable essay edit. */
export const essaySnapshot = (s: Partial<Story>) => ({
  title: s.title,
  blocks: s.blocks,
  style: s.style,
  notes: s.notes,
  presets: s.presets,
  formatting: s.formatting,
})
export const sameEssay = (a: Partial<Story>, b: Partial<Story>) =>
  JSON.stringify(essaySnapshot(a)) === JSON.stringify(essaySnapshot(b))
export function essayHistory(story: Story) {
  const history = story.history || []
  return history.filter((version, i) => {
    try {
      return !sameEssay(JSON.parse(version.snap), history[i + 1] ? JSON.parse(history[i + 1].snap) : story)
    } catch {
      return false
    }
  })
}
