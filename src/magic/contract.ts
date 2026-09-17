import type { ArtifactOutput, Attachment, MagicLayout, MagicMode, Style } from '../model/types.js'

/** Shared wire contract; no browser or provider implementation dependencies. */
export interface GenerateRequest {
  mode: MagicMode
  layout?: MagicLayout
  instruction: string
  originalPrompt: string
  attachments: Attachment[]
  previous?: ArtifactOutput
  history: string[]
  style: Style
}
