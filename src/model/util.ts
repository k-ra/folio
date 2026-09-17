import type { Block, Story } from './types'

let uid = 0
export const newId = () => 'b' + Date.now().toString(36) + (uid++).toString(36)

export const textBlock = (text = ''): Block => ({ id: newId(), type: 'text', text })

export const hexToRgb = (h: string): [number, number, number] => {
  const s = h.replace('#', '')
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return [253, 251, 246]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const isDark = (hex: string) => {
  const [r, g, b] = hexToRgb(hex)
  return r * 0.299 + g * 0.587 + b * 0.114 < 128
}

export const wordCount = (s: Story) =>
  s.blocks.reduce((n, b) => {
    const t = 'text' in b ? b.text : ''
    return n + (t && t.trim() ? t.trim().split(/\s+/).length : 0)
  }, 0)

export const excerptOf = (s: Story) => {
  const b = s.blocks.find((x) => x.type === 'text' && x.text.trim())
  return b && 'text' in b ? b.text : ''
}

export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))

/** ease-in-out quad */
export const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)

export const fmtWhen = (t: number) => {
  const d = Date.now() - t
  if (d < 60000) return 'now'
  if (d < 3600000) return Math.round(d / 60000) + 'm ago'
  if (d < 86400000) return Math.round(d / 3600000) + 'h ago'
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export const todayLabel = () => 'TODAY'

export const dateLabel = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()
