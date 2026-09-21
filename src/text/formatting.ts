export type MarkKind = 'bold' | 'italic' | 'underline' | 'strike' | 'code'
export interface TextMark {
  from: number
  to: number
  kind: MarkKind
}
export type Formatting = Record<string, TextMark[]>
const kinds: MarkKind[] = ['bold', 'italic', 'underline', 'strike', 'code']

export function normalizeMarks(text: string, marks: TextMark[] = []): TextMark[] {
  return kinds.flatMap((kind) => {
    const result: TextMark[] = []
    for (const m of marks
      .filter((m) => m.kind === kind)
      .map((m) => ({
        kind,
        from: Math.max(0, Math.min(text.length, m.from)),
        to: Math.max(0, Math.min(text.length, m.to)),
      }))
      .filter((m) => m.to > m.from)
      .sort((a, b) => a.from - b.from)) {
      const last = result[result.length - 1]
      if (last && m.from <= last.to) last.to = Math.max(last.to, m.to)
      else result.push(m)
    }
    return result
  })
}
export function textSegments(text: string, marks: TextMark[] = []) {
  const safe = normalizeMarks(text, marks)
  const boundaries = [...new Set([0, text.length, ...safe.flatMap((m) => [m.from, m.to])])].sort(
    (a, b) => a - b,
  )
  return boundaries.slice(0, -1).map((from, i) => ({
    text: text.slice(from, boundaries[i + 1]),
    kinds: safe.filter((m) => m.from <= from && m.to >= boundaries[i + 1]).map((m) => m.kind),
  }))
}
export function sliceMarks(marks: TextMark[] = [], from: number, to: number): TextMark[] {
  return marks
    .map((m) => ({
      ...m,
      from: Math.max(from, m.from) - from,
      to: Math.min(to, m.to) - from,
    }))
    .filter((m) => m.to > m.from)
}
export const shiftMarks = (marks: TextMark[] = [], offset: number) =>
  marks.map((m) => ({ ...m, from: m.from + offset, to: m.to + offset }))
export const withFormatting = (
  formatting: Formatting | undefined,
  id: string,
  text: string,
  marks: TextMark[],
) => {
  const next = { ...formatting },
    clean = normalizeMarks(text, marks)
  if (clean.length) next[id] = clean
  else delete next[id]
  return Object.keys(next).length ? next : undefined
}
export interface TextNode {
  type: string
  text?: string
  marks?: { type: string }[]
  content?: TextNode[]
}
export function textDocument(text: string, marks: TextMark[] = []): TextNode {
  const content = textSegments(text, marks).flatMap((segment) =>
    segment.text.split('\n').flatMap((line, i) => [
      ...(i
        ? [
            {
              type: 'hardBreak',
              marks: segment.kinds.map((type) => ({ type })),
            },
          ]
        : []),
      ...(line
        ? [
            {
              type: 'text',
              text: line,
              marks: segment.kinds.map((type) => ({ type })),
            },
          ]
        : []),
    ]),
  )
  return { type: 'doc', content: [{ type: 'paragraph', content }] }
}
export function readTextDocument(doc: TextNode) {
  let text = ''
  const marks: TextMark[] = []
  const walk = (node: TextNode) => {
    if ((node.type === 'text' && node.text) || node.type === 'hardBreak') {
      const from = text.length
      text += node.type === 'hardBreak' ? '\n' : node.text
      for (const m of node.marks || [])
        if (kinds.includes(m.type as MarkKind))
          marks.push({ from, to: text.length, kind: m.type as MarkKind })
    } else
      node.content?.forEach((child, i) => {
        if (node.type === 'doc' && i && child.type !== 'text' && child.type !== 'hardBreak') text += '\n'
        walk(child)
      })
  }
  walk(doc)
  return { text, marks: normalizeMarks(text, marks) }
}
export function formatShortcut(e: {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  key: string
}): MarkKind | null {
  if ((!e.metaKey && !e.ctrlKey) || e.altKey) return null
  const key = e.key.toLowerCase()
  return !e.shiftKey
    ? ({ b: 'bold', i: 'italic', u: 'underline' } as const)[key as 'b'] || null
    : key === 'x'
      ? 'strike'
      : key === 'm'
        ? 'code'
        : null
}
