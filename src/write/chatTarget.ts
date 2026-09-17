import type { Panel, Story } from '../model/types'
import { currentRevision } from '../magic/state'

/** Editable blocks share one conversation, whichever control opens it. */
export function chatTarget(story: Story, id?: string | null): Panel {
  const block = story.blocks.find((b) => b.id === id)
  return block?.type === 'fancy' || (block?.type === 'magic' && currentRevision(block))
    ? { kind: 'block', id: block.id }
    : { kind: 'chat' }
}

export const isChatPanel = (panel: Panel | null) => panel?.kind === 'chat' || panel?.kind === 'block'
