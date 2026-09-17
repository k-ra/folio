import type { ArtifactOutput, ArtifactRevision, MagicBlock, Story, Style } from '../model/types'
import { newId } from '../model/util'
import { sourceNames } from './source'

export const currentRevision = (b: MagicBlock): ArtifactRevision | undefined => b.revisions[b.revision]
export const marginInstruction = (b: MagicBlock) => b.editDraft ?? currentRevision(b)?.instruction ?? ''
export const hasUnsentInstruction = (b: MagicBlock) =>
  marginInstruction(b).trim() !== (currentRevision(b)?.instruction ?? '').trim()
export const newMagicBlock = (id: string): MagicBlock => ({
  id,
  type: 'magic',
  mode: 'graphics',
  prompt: '',
  status: 'prompt',
  attachments: [],
  revisions: [],
  revision: -1,
})

export function updateMagic(s: Story, id: string, fn: (b: MagicBlock) => MagicBlock): Story {
  return { ...s, blocks: s.blocks.map((b) => (b.id === id && b.type === 'magic' ? fn(b) : b)) }
}

/** One commit updates output, margin, and conversation together, regardless of entry point. */
export function commitArtifact(
  s: Story,
  id: string,
  requestId: string,
  instruction: string,
  output: ArtifactOutput,
  style: Style,
  sources?: string[],
  provider?: MagicBlock['provider'],
): Story {
  const b = s.blocks.find((b) => b.id === id)
  if (!b || b.type !== 'magic' || b.requestId !== requestId) return s
  const revisions = [
    ...b.revisions.slice(0, b.revision + 1),
    {
      id: newId(),
      instruction,
      output,
      style,
      provider: provider ?? b.provider,
      sourceNames: sources ?? sourceNames(b),
    },
  ].slice(-12)
  const next = updateMagic(s, id, (x) => ({
    ...x,
    revisions,
    revision: revisions.length - 1,
    status: 'done',
    editDraft: undefined,
    requestId: undefined,
    error: undefined,
  }))
  return {
    ...next,
    chats: {
      ...next.chats,
      [id]: [
        ...(next.chats[id] || []),
        { me: true, text: instruction },
        {
          me: false,
          text: output.demo
            ? 'Preview updated. This is a local sample; connect generation for a result from your full prompt.'
            : output.kind === 'html' && output.reply?.trim()
              ? output.reply
              : 'Updated the artifact.',
        },
      ],
    },
  }
}

export function restoreArtifact(s: Story, id: string, revision: number): Story {
  const b = s.blocks.find((b) => b.id === id)
  if (!b || b.type !== 'magic' || !b.revisions[revision]) return s
  const next = updateMagic(s, id, (x) => ({
    ...x,
    revision,
    status: 'done',
    requestId: undefined,
    error: undefined,
    editDraft: undefined,
  }))
  return {
    ...next,
    chats: {
      ...next.chats,
      [id]: [
        ...(s.chats[id] || []),
        { me: false, text: `Restored version ${revision + 1}: ${b.revisions[revision].instruction}` },
      ],
    },
  }
}
