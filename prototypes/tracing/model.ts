import liveResponse from './live-response.md?raw'
export type Message = { id: string; who: 'You' | 'Folio'; text: string }
export type Clipping = {
  id: string
  messageId: string
  excerpt: string
  conversation: Message[]
  source?: 'chat' | 'essay'
}
export type Notebook = { messages: Message[]; clips: Clipping[] }
export const KEY = 'folio.prototype.tracing-index.v1'
export const sample: Notebook = {
  messages: [
    { id: 'question', who: 'You', text: 'What could hold an essay about noticing small changes together?' },
    {
      id: 'live-reading-2026-09-21',
      who: 'Folio',
      text: liveResponse,
    },
    {
      id: 'follow-up',
      who: 'You',
      text: 'The interval, not the event. I want to keep that distinction nearby without putting it into the essay yet.',
    },
  ],
  clips: [],
}
export function load(): Notebook {
  const raw = localStorage.getItem(KEY)
  if (!raw) return sample
  const value = JSON.parse(raw) as Notebook
  if (
    !Array.isArray(value.messages) ||
    !Array.isArray(value.clips) ||
    !value.messages.every(
      (m) => typeof m.id === 'string' && typeof m.text === 'string' && ['You', 'Folio'].includes(m.who),
    ) ||
    !value.clips.every(
      (c) => typeof c.id === 'string' && typeof c.excerpt === 'string' && Array.isArray(c.conversation),
    )
  )
    throw new Error('This prototype notebook could not be read. The stored copy has not been changed.')
  // Add the captured live layout study once, without replacing any saved notes or clippings.
  if (!value.messages.some((m) => m.id === 'live-reading-2026-09-21')) value.messages.push(sample.messages[1])
  return value
}
export function keep(
  book: Notebook,
  messageId: string,
  excerpt: string,
  source: 'chat' | 'essay' = 'chat',
  essay = '',
): Notebook {
  if (book.clips.some((c) => c.messageId === messageId && c.excerpt === excerpt)) return book
  return {
    ...book,
    clips: [
      ...book.clips,
      {
        id: crypto.randomUUID(),
        messageId,
        excerpt,
        source,
        conversation:
          source === 'essay' ? [{ id: 'essay', who: 'You', text: essay }] : structuredClone(book.messages),
      },
    ],
  }
}
