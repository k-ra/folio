import type { FocusLabel } from '../ai'
import type { ChatFocus, Story } from '../model/types'

/** Describe a chat focus as the panel shows it: `PARAGRAPH 3  first words…`. */
export function focusLabel(s: Story, f: ChatFocus): FocusLabel | null {
  const i = s.blocks.findIndex((b) => b.id === f.id)
  const b = s.blocks[i]
  if (!b) return null
  const paras = s.blocks.slice(0, i + 1).filter((x) => x.type === 'text').length
  const kind =
    b.type === 'text'
      ? 'PARAGRAPH ' + paras
      : b.type === 'magic'
        ? 'ARTIFACT · ' + b.mode.toUpperCase()
      : b.type === 'graphic'
        ? 'GRAPHIC · ' + (b.caption || 'untitled')
        : b.type === 'media'
          ? 'IMAGE'
          : b.type === 'fancy'
            ? 'FANCY TEXT'
            : 'PADDING'
  const quote = f.quote || (b.type === 'text' && b.text ? b.text.slice(0, 80) + (b.text.length > 80 ? '…' : '') : '')
  return { kind, quote }
}
