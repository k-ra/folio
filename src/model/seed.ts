import { DEF_STYLE } from './constants'
import { sampleStyle } from './sampleStyles'
import { mockEssay } from './samples/mockEssay'
import type { Block, Story, ThumbKind } from './types'
import { newId, textBlock as T } from './util'

/** Original public demo writing. No personal essays or workspace exports are bundled. */
export function seed(): Story[] {
  const fieldBlocks: Block[] = [
    T(
      'A field guide begins with attention. Pick one ordinary place: a windowsill, a bus stop, a patch of ground beside a path. Return at the same hour for a week. Write down what changes and what stays the same. A description does not need to be grand to be precise; it needs a place, a time, and something another person could look for.',
    ),
    T(
      'Separate what you observed from what you inferred. “Three birds on the fence” is an observation. “They are waiting for rain” is an interpretation. Both can belong in an essay, but they should not look like the same kind of evidence.',
    ),
    T(
      'A small table can reveal repetition; a drawing can explain a shape. Give each its source and leave room for uncertainty. Use a magic block to explore an idea, then check the result against the notes that started it.',
    ),
    {
      id: newId(),
      type: 'fancy',
      text: 'Look closely. Record lightly. Return.',
      prompt: 'big, centred, in the header font. let it breathe',
      fancy: { size: 30, align: 'center', font: 'header', italic: false, pad: 30, ls: 0 },
    },
    T(
      'This is a demonstration essay. Replace it with your own observations, use the margins to ask for a change, or start a new story. Your writing stays in this browser unless you choose to send context to a connected AI provider.',
    ),
    T(''),
  ]
  const fieldGuide: Story = {
    id: 's-fieldguide',
    title: 'A small field guide',
    date: 'DEMO',
    thumb: 'mono',
    style: sampleStyle('s-fieldguide')!,
    sampleStyleVersion: 2,
    chats: {},
    blocks: fieldBlocks,
    notes: { [fieldBlocks[0].id]: 'A place, a time, an observable detail.' },
  }
  const demo = (id: string, title: string, thumb: ThumbKind, text: string): Story => ({
    id,
    title,
    date: 'DEMO',
    thumb,
    style: sampleStyle(id) ?? { ...DEF_STYLE },
    sampleStyleVersion: 2,
    chats: {},
    notes: {},
    blocks: [T(text), T('')],
  })
  return [
    mockEssay(),
    demo(
      's-notebook',
      'Keep a notebook',
      'lines',
      'A notebook can hold questions before it holds answers. Start with one thing you noticed today. Put the extra thought in the margin; let the main sentence stay simple.',
    ),
    demo(
      's-patterns',
      'Patterns in a week',
      'bars',
      'Seven observations are enough to ask a better question, but not always enough to answer it. Attach a CSV to a data block and distinguish the measured values from the story you tell about them.',
    ),
    demo(
      's-colors',
      'A study in color',
      'gradient',
      'A page can borrow its atmosphere from a few colors. This sample uses a warm-to-green gradient; open Style to change its stops or return to plain paper.',
    ),
    demo(
      's-night',
      'After the lights dim',
      'aa',
      'Light type on dark paper changes the rhythm of a page. Keep the contrast comfortable, leave room between paragraphs, and give one idea the space it needs.',
    ),
    fieldGuide,
  ]
}

export const blankStory = (): Story => ({
  id: newId(),
  title: '',
  date: 'TODAY',
  thumb: 'lines',
  style: { ...DEF_STYLE },
  chats: {},
  notes: {},
  blocks: [T('')],
})
