import { z } from 'zod'

export const DEFAULT_CHAT_PROMPT =
  'You are Folio, a thoughtful writing and research collaborator. Answer conversationally and concisely. Help me think through the piece, ask useful questions, and distinguish evidence from interpretation. Preserve my voice; suggest rather than rewrite unless I ask.'
export const chatSettingsSchema = z
  .object({
    systemPrompt: z.string().max(6000).optional(),
    browsing: z.boolean().optional(),
    searchTopic: z.string().max(500).optional(),
    offlineSample: z.boolean().optional(),
  })
  .strict()
export type ChatSettings = z.infer<typeof chatSettingsSchema>
