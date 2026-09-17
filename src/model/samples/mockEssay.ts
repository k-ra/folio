import { newMagicBlock } from '../../magic/state'
import { FOLIO_STYLE } from '../../style/presets'
import type { Story, Style } from '../types'
import { whaleStory } from './whales'

/** The shared review fixture: a complete essay, not a gallery of disconnected controls. */
export const MOCK_ESSAY_ID = 's-whales'

export function mockEssay(style: Style = FOLIO_STYLE): Story {
  const story = whaleStory()
  const prompt = {
    ...newMagicBlock('whales-rhythm'),
    prompt:
      'Make an interactive diagram of a short sequence of clicks. Let the reader change the gaps between them to explore rhythm and tempo. Use thin lines and label it as an illustrative pattern, not a recording or a translation of whale speech.',
  }
  return {
    ...story,
    id: MOCK_ESSAY_ID,
    style: { ...style },
    notes: {
      'whales-language':
        'Keep this distinction clear: finding a pattern is not the same as knowing what it means.',
    },
    blocks: story.blocks.flatMap((block) => {
      if (block.id === 'whales-language') return [block, prompt]
      if (block.type === 'magic')
        return [{ ...block, revisions: block.revisions.map((r) => ({ ...r, style: { ...style } })) }]
      return [block]
    }),
  }
}

/** One-time workspace addition. Existing edits are never replaced. */
export function introduceMockEssay(stories: Story[]): Story[] {
  const existing = stories.find((story) => story.id === MOCK_ESSAY_ID)
  const original = whaleStory()
  const untouched =
    existing &&
    existing.title === original.title &&
    JSON.stringify(existing.blocks) === JSON.stringify(original.blocks)
  const essay = untouched
    ? {
        ...existing,
        blocks: mockEssay(existing.style).blocks,
        notes: { ...mockEssay().notes, ...existing.notes },
      }
    : existing || mockEssay()
  return [essay, ...stories.filter((story) => story.id !== MOCK_ESSAY_ID)]
}
