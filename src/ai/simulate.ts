import type { ChatMessage, HomeThemeKey, Story, Style } from '../model/types'
import type { AI, FocusLabel, RestyleResult } from './index'

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Prototype simulation: keyword matching that documents the intended intents. */
export const simulated: AI = {
  async restyle(prompt: string, current: Style): Promise<RestyleResult> {
    const t = prompt.toLowerCase()
    const d: Partial<Style> = {}
    const notes: string[] = []
    if (/shader|plasma|live|liquid|aurora|flow/.test(t)) {
      d.backdrop = 'shader'
      d.paper = 'card'
      notes.push('live shader backdrop, paper as a card')
    } else if (/gradient|blur|shifting|drift|fog|mist/.test(t)) {
      d.backdrop = 'drift'
      notes.push('drifting gradient backdrop')
    }
    if (/photo|image|picture/.test(t) && /back|behind/.test(t))
      notes.push('drop an image with the IMG button to use it as the backdrop')
    if (/full ?screen|full bleed|no card|edge to edge/.test(t)) {
      d.paper = 'full'
      notes.push('paper full-bleed')
    } else if (/card|float|foreground|frame|sheet on top/.test(t)) {
      d.paper = 'card'
      notes.push('paper floating as a card')
    }
    if (/no backdrop|plain|remove the back/.test(t)) {
      d.backdrop = 'none'
      notes.push('backdrop off')
    }
    if (/serif|caslon|manual|old|print/.test(t)) {
      d.headerFont = 'Libre Caslon Text'
      notes.push('header in Libre Caslon')
    }
    if (/newsreader|newspaper|editorial/.test(t)) {
      d.bodyFont = 'Newsreader'
      notes.push('body in Newsreader')
    }
    if (/mono|typewriter|code/.test(t)) {
      d.bodyFont = 'IBM Plex Mono'
      notes.push('body in Plex Mono')
    }
    if (/sans|clean/.test(t)) {
      d.bodyFont = 'Instrument Sans'
      notes.push('body in Instrument Sans')
    }
    if (/warm|cream|paper/.test(t)) {
      d.bg = '#f3ecdf'
      notes.push('paper #f3ecdf')
    }
    if (/dark|night|black/.test(t)) {
      d.bg = '#1f1c19'
      d.ink = '#efe9dd'
      notes.push('dark paper, cream ink')
    }
    if (/white|cool|clinical/.test(t)) {
      d.bg = '#ffffff'
      d.ink = '#1a1a1a'
      notes.push('white paper')
    }
    if (/less contrast|soft/.test(t)) {
      d.ink = '#4a443d'
      notes.push('softer ink')
    }
    if (/small|tighter/.test(t)) {
      d.size = Math.max(14, current.size - 2)
      notes.push(`size ${d.size}`)
    }
    if (/big|larger|bigger/.test(t)) {
      d.size = current.size + 2
      notes.push(`size ${d.size}`)
    }
    if (/air|breathe|space|loose/.test(t)) {
      d.gap = current.gap + 10
      notes.push(`gap ${d.gap}`)
    }
    await wait(120)
    return {
      patch: d,
      explanation: notes.length
        ? `Previewing: ${notes.join(', ')}. Press Apply when it feels right.`
        : 'I can hear it, but I need a handle: a font, a paper colour, a size, or a feeling like “warmer”, “airier”, “darker”.',
    }
  },

  async chat(
    _messages: ChatMessage[],
    text: string,
    focus: FocusLabel | null,
    essay: Story,
  ): Promise<string> {
    const t = text.toLowerCase()
    await wait(200)
    if (focus) {
      const q = focus.quote
        ? ' — “' + focus.quote.slice(0, 40) + (focus.quote.length > 40 ? '…' : '') + '”'
        : ''
      const body = /clinical|cold/.test(t)
        ? 'Try a more concrete observation; supporting details could move to a margin note.'
        : /cut|shorter|tighten/.test(t)
          ? 'I’d cut the second sentence; the first already carries it.'
          : 'What should change here?'
      return `Looking at ${focus.kind.toLowerCase()}${q}. ${body}`
    }
    const n = essay.blocks.filter((b) => b.type === 'text' && b.text.trim()).length
    if (/heavy|too much|dense/.test(t))
      return `Try moving supporting detail from paragraphs ${Math.max(1, n - 2)}–${n} into the margins, then read the ending aloud.`
    if (/title/.test(t))
      return `For “${essay.title || 'Untitled'}”, try a title drawn from one concrete image in the piece. Connect your own AI provider for a closer reading.`
    return `I’ve read the ${n} paragraphs. Ask me about the shape of the piece, where it drags, or what a reader will remember.`
  },

  async dataReply(_text: string, files: string[]): Promise<string> {
    await wait(120)
    return `Drop a CSV or an image into the essay and it lands here. Right now: ${files.join(', ') || 'nothing yet'}.`
  },

  async homeTheme(prompt: string): Promise<HomeThemeKey | null> {
    const t = prompt.toLowerCase()
    if (/blue|dusk|sea|fog|moody/.test(t)) return 'blue'
    if (/dark|night|black|room/.test(t)) return 'night'
    if (/paper|cream|warm|light|day/.test(t)) return 'paper'
    return null
  },
}
