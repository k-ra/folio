export type Message = { id: string; who: 'You' | 'Folio'; text: string }
export type Clipping = { id: string; messageId: string; excerpt: string; conversation: Message[] }
export type Notebook = { messages: Message[]; clips: Clipping[] }
export const KEY = 'folio.prototype.tracing-index.v1'
export const sample: Notebook = {
  messages: [
    { id: 'question', who: 'You', text: 'What could hold an essay about noticing small changes together?' },
    {
      id: 'answer',
      who: 'Folio',
      text: 'Perhaps the interval matters as much as the observation. Return to the same window, at the same hour, and let what changed give the essay its structure.\n\nKeep interpretation separate from the record: one line for what you saw, another for what you think it means.',
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
  return value
}
export function keep(book: Notebook, messageId: string, excerpt: string): Notebook {
  if (book.clips.some((c) => c.messageId === messageId && c.excerpt === excerpt)) return book
  return {
    ...book,
    clips: [
      ...book.clips,
      { id: crypto.randomUUID(), messageId, excerpt, conversation: structuredClone(book.messages) },
    ],
  }
}
