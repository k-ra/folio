import type { KeyboardEvent, MouseEvent } from 'react'
import type { Block, BlockType, ChatFocus, Panel, Story, Style } from '../model/types'
import type { MagicCtl } from '../magic/useMagic'
import type { FancyCtl } from '../fancy/useFancy'

/** Everything the block renderer and panel need from the writing page. */
export interface WriteCtl {
  story: Story
  /** The style being shown: the draft while Style is open, else the applied style. */
  V: Style
  /** The applied style. */
  S: Style
  files: string[]
  lineH: number

  sel: string | null
  blockHover: string | null
  picker: string | null
  panel: Panel | null
  draft: Style | null
  chatInput: string
  chatFocus: ChatFocus | null
  busy: boolean
  chatError: string
  magic: MagicCtl
  fancy: FancyCtl

  setSel: (id: string | null) => void
  hoverBlock: (id: string | null) => void
  selectBlock: (id: string) => void
  focusBlock: (id: string) => void
  selText: (id: string, quote: string) => void
  togglePicker: (id: string) => void
  pickType: (id: string, t: Exclude<BlockType, 'text' | 'graphic'>) => void
  setBlockText: (id: string, v: string) => void
  setBlockPrompt: (id: string, v: string) => void
  blockKey: (e: KeyboardEvent<HTMLTextAreaElement>, id: string) => void
  openArtifactChat: (id: string) => void
  pickMedia: (id: string, file: File) => void
  deleteBlock: (id: string) => void
  padDown: (e: MouseEvent, id: string, block: Extract<Block, { type: 'padding' }>) => void
  addNote: (id: string) => void
  setNote: (id: string, v: string) => void
  noteBlur: (id: string) => void

  togglePanel: (kind: 'data' | 'style' | 'chat') => void
  closePanel: () => void
  setDraft: (patch: Partial<Style>) => void
  pickBackdropImage: (file: File) => void
  applyStyle: () => void
  resetStyle: () => void
  savePreset: (name: string) => void
  setChatInput: (v: string) => void
  sendChat: () => void
  clearFocus: () => void
}
