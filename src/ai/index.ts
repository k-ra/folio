import type { ChatMessage, HomeThemeKey, Story, Style } from '../model/types'

/**
 * Writing and style assistance. Artifact generation lives in ../magic/provider;
 * connected typography styling lives in ../fancy/useFancy.
 *
 * `simulated` (default) reproduces the prototype's keyword matching so the
 * product is usable offline. A real implementation backs the same calls with
 * one tool-calling LLM that sees the whole essay and its data files:
 *
 *   restyle(prompt, style)          → { stylePatch, backdropHTML?, containerCSS?, explanation }
 *   chat(messages, focus?, essay)   → text
 */
export interface RestyleResult {
  patch: Partial<Style>
  explanation: string
  /** Optional rendered backdrop markup the model may return (see Notes.md). */
  backdropHTML?: string
  containerCSS?: string
}

export interface FocusLabel {
  kind: string
  quote: string
}

export interface AI {
  restyle(prompt: string, current: Style): Promise<RestyleResult>
  chat(messages: ChatMessage[], text: string, focus: FocusLabel | null, essay: Story): Promise<string>
  dataReply(text: string, files: string[]): Promise<string>
  homeTheme(prompt: string): Promise<HomeThemeKey | null>
}

export { simulated } from './simulate'
