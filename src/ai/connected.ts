import type { ChatMessage, Story } from '../model/types'
import type { FocusLabel } from './index'
import { currentRevision } from '../magic/state'
import { apiFetch } from './session'

/** Send only this story's current content, not its saved snapshots or other stories. */
export function chatContext(story: Story) {
  return {
    title: story.title,
    style: story.style,
    notes: story.notes,
    sources: story.sources,
    blocks: story.blocks.map((b) =>
      b.type === 'magic'
        ? {
            id: b.id,
            type: b.type,
            mode: b.mode,
            prompt: b.prompt,
            current:
              currentRevision(b)?.output.kind === 'image'
                ? { kind: 'image', caption: currentRevision(b)?.output.caption }
                : currentRevision(b)?.output,
            attachments: b.attachments.filter((a) => a.kind === 'data'),
          }
        : 'text' in b
          ? { id: b.id, type: b.type, text: b.text }
          : { id: b.id, type: b.type },
    ),
  }
}

export async function connectedChat(
  messages: ChatMessage[],
  instruction: string,
  focus: FocusLabel | null,
  story: Story,
  signal: AbortSignal,
) {
  const response = await apiFetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ instruction, focus, history: messages.slice(-24), story: chatContext(story) }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Chat could not connect. Your message is saved.')
  if (typeof result.reply !== 'string' || !result.reply.trim())
    throw new Error('The model returned no reply. Please retry.')
  return result.reply as string
}
