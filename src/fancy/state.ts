import type { FancyBlock, FancyRevision, Story } from '../model/types'
import type { FancyResult } from './contract'

export const fancyInstruction = (b: FancyBlock) => b.editDraft ?? b.prompt
export const hasFancyDraft = (b: FancyBlock) =>
  !!fancyInstruction(b).trim() && (!b.revisions?.length || fancyInstruction(b).trim() !== b.prompt.trim())

export function updateFancy(story: Story, id: string, fn: (b: FancyBlock) => FancyBlock): Story {
  return { ...story, blocks: story.blocks.map((b) => (b.id === id && b.type === 'fancy' ? fn(b) : b)) }
}

export function commitFancy(
  s: Story,
  id: string,
  requestId: string,
  instruction: string,
  result: FancyResult,
): Story {
  const b = s.blocks.find((b) => b.id === id)
  if (b?.type !== 'fancy' || b.requestId !== requestId) return s
  // The first revision is the original styling, so the very first AI edit is undoable.
  const previous: FancyRevision[] = b.revisions?.length
    ? b.revisions.slice(0, (b.revision ?? 0) + 1)
    : [{ instruction: b.prompt, fancy: { ...b.fancy } }]
  const revisions = [...previous, { instruction, fancy: result.fancy }].slice(-20)
  const next = updateFancy(s, id, (b) => ({
    ...b,
    fancy: result.fancy,
    prompt: instruction,
    editDraft: undefined,
    revisions,
    revision: revisions.length - 1,
    status: 'idle',
    requestId: undefined,
    error: undefined,
  }))
  return {
    ...next,
    chats: {
      ...next.chats,
      [id]: [...(next.chats[id] || []), { me: true, text: instruction }, { me: false, text: result.reply }],
    },
  }
}

/** Undo typography only: later writing edits must never be lost. */
export function restoreFancy(s: Story, id: string, revision: number): Story {
  const b = s.blocks.find((b) => b.id === id)
  if (b?.type !== 'fancy') return s
  const target = b.revisions?.[revision]
  if (!target) return s
  const next = updateFancy(s, id, (b) => ({
    ...b,
    fancy: target.fancy,
    prompt: target.instruction,
    editDraft: undefined,
    revision,
    status: 'idle',
    requestId: undefined,
    error: undefined,
  }))
  return {
    ...next,
    chats: {
      ...next.chats,
      [id]: [
        ...(next.chats[id] || []),
        { me: false, text: `Restored text style ${revision + 1}. Your words are unchanged.` },
      ],
    },
  }
}
