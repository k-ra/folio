import type { ImageModel } from '../magic/models.js'

export type FontName = 'Instrument Sans' | 'Libre Caslon Text' | 'Newsreader' | 'Archivo' | 'IBM Plex Mono'
export type Backdrop = 'none' | 'gradient' | 'custom' | 'drift' | 'shader' | 'image'
export type Paper = 'full' | 'card'

export interface Style {
  bodyFont: FontName
  headerFont: FontName
  size: number
  gap: number
  bg: string
  ink: string
  backdrop: Backdrop
  backdropSrc: string | null
  backgroundFrom?: string
  backgroundVia?: string
  backgroundTo?: string
  backgroundAngle?: number
  backgroundMotion?: boolean
  /** CSS only, rendered in a scriptless, network-isolated iframe. */
  backgroundCode?: string
  backgroundPrompt?: string
  paper: Paper
  strokeWidth: number
  chartStyle: 'line' | 'bar' | 'area'
  imageStyle: 'linework' | 'grain' | 'natural'
  imageDirection: string
  imageModel: ImageModel
  graphicDirection: string
  linkStyle: 'underline' | 'quiet' | 'highlight'
  loading: 'contour' | 'weave' | 'script'
}

export type MagicMode = 'image' | 'graphics' | 'data'
export type MagicLayout = 'column' | 'full-bleed'
export interface Attachment {
  id: string
  name: string
  kind: 'data' | 'image'
  content: string
}
export interface Datum {
  label: string
  value: number
}
export type ArtifactOutput =
  | {
      kind: 'chart'
      points: Datum[]
      chartStyle: Style['chartStyle']
      caption: string
      xLabel: string
      yLabel: string
      demo?: boolean
    }
  | { kind: 'image'; src: string; caption: string; demo?: boolean }
  | { kind: 'html'; html: string; caption: string; demo?: boolean; reply?: string }
export interface ArtifactRevision {
  id: string
  /** Source labels belong to the output, not the next edit's attachment list. */
  sourceNames?: string[]
  instruction: string
  output: ArtifactOutput
  style: Style
  provider?: 'preview' | 'connected'
}
export interface MagicBlock {
  id: string
  type: 'magic'
  mode: MagicMode
  /** Presentation only; changing width does not regenerate or replace an artifact. */
  layout?: MagicLayout
  provider?: 'preview' | 'connected'
  prompt: string
  status: 'prompt' | 'rendering' | 'done' | 'error'
  attachments: Attachment[]
  revisions: ArtifactRevision[]
  revision: number
  editDraft?: string
  requestId?: string
  error?: string
}
export interface StylePreset {
  id: string
  name: string
  style: Style
}

export interface FancyParams {
  size: number
  align: 'left' | 'center' | 'right'
  font: 'body' | 'header' | 'mono' | FontName
  italic: boolean
  pad: number
  ls: number
  weight?: number
  lineHeight?: number
  transform?: 'none' | 'uppercase' | 'lowercase'
  color?: string
  motion?: 'none' | 'marquee' | 'float' | 'reveal'
  duration?: number
  direction?: 'left' | 'right'
}

export interface FancyRevision {
  instruction: string
  fancy: FancyParams
}
export interface FancyBlock {
  id: string
  type: 'fancy'
  text: string
  prompt: string
  fancy: FancyParams
  editDraft?: string
  status?: 'idle' | 'rendering' | 'error'
  requestId?: string
  error?: string
  revisions?: FancyRevision[]
  revision?: number
}

export type GraphicStatus = 'prompt' | 'rendering' | 'done'

export type Block =
  | MagicBlock
  | { id: string; type: 'text'; text: string }
  | FancyBlock
  | {
      id: string
      type: 'graphic'
      prompt: string
      status: GraphicStatus
      data: string[]
      inferred?: boolean
      caption: string
      hatch: boolean
      thin: boolean
      renderKey?: number
    }
  | { id: string; type: 'media'; src: string | null; text: string }
  | { id: string; type: 'padding'; h: number }

export type BlockType = Block['type']

export interface ChatMessage {
  me: boolean
  text: string
  focus?: string | null
}

export interface Version {
  t: number
  label: string
  words: number
  snap: string
}

export type ThumbKind = 'lines' | 'bars' | 'gradient' | 'aa' | 'mono' | 'photo'

export interface Story {
  id: string
  title: string
  date: string
  thumb: ThumbKind
  style: Style
  files?: string[]
  sources?: { label: string; url: string }[]
  blocks: Block[]
  notes: Record<string, string>
  chats: Record<string, ChatMessage[]>
  history?: Version[]
  presets?: StylePreset[]
  /** One-time built-in sample appearance migration, independent of rolling history. */
  sampleStyleVersion?: number
}

export type HomeThemeKey = 'blue' | 'paper' | 'night'

export interface HomeTheme {
  name: string
  bg: string
  bgImage: string
  ink: string
  panel: string
}

export type PanelKind = 'data' | 'style' | 'chat'
export type Panel = { kind: PanelKind } | { kind: 'block'; id: string }

export interface ChatFocus {
  id: string
  quote?: string
}
