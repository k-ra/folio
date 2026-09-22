/** Plain author text must not acquire Markdown syntax when clipped. */
export function literalMarkdown(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/([\\`*_{}\[\]<>()#+\-.!|~>])/g, '\\$1')
}

/** Serialize only selected prose. Walking ancestors retains partially selected emphasis. */
export function selectionMarkdown(root: HTMLElement, range: Range): string {
  const visit = (node: Node, raw = false): string => {
    if (!range.intersectsNode(node)) return ''
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').slice(
        node === range.startContainer ? range.startOffset : 0,
        node === range.endContainer ? range.endOffset : undefined,
      )
      return raw ? text : literalMarkdown(text)
    }
    if (!(node instanceof HTMLElement)) return ''
    const tag = node.tagName.toLowerCase()
    if (['button', 'script', 'style', 'input'].includes(tag)) return ''
    const code = tag === 'code' || tag === 'pre'
    const body = [...node.childNodes].map((child) => visit(child, raw || code)).join('')
    if (tag === 'br') return '  \n'
    if (tag === 'hr') return '\n\n---\n\n'
    if (!body.trim()) return body
    const wrap = (marker: string) => body.replace(/^(\s*)([\s\S]*?)(\s*)$/, `$1${marker}$2${marker}$3`)
    if (tag === 'strong' || tag === 'b') return wrap('**')
    if (tag === 'em' || tag === 'i') return wrap('*')
    if (tag === 'del' || tag === 's') return wrap('~~')
    if (tag === 'code' && node.parentElement?.tagName !== 'PRE') {
      const fence = '`'.repeat(Math.max(0, ...[...body.matchAll(/`+/g)].map((m) => m[0].length)) + 1)
      return `${fence} ${body} ${fence}`
    }
    if (tag === 'pre') {
      const fence = '`'.repeat(Math.max(2, ...[...body.matchAll(/`+/g)].map((m) => m[0].length)) + 1)
      const language = node.querySelector('code')?.className.match(/language-([\w-]+)/)?.[1] || ''
      return `\n\n${fence}${language}\n${body.replace(/\n$/, '')}\n${fence}\n\n`
    }
    if (tag === 'a') {
      const href = node.getAttribute('href') || ''
      return /^(https?:|mailto:|#|\/)/i.test(href)
        ? `[${body}](<${href.replace(/[<>\s]/g, (c) => encodeURIComponent(c))}>)`
        : body
    }
    if (/^h[1-6]$/.test(tag)) return `\n\n${'#'.repeat(Number(tag[1]))} ${body.trim()}\n\n`
    if (tag === 'li') {
      const parent = node.parentElement
      const prefix =
        parent?.tagName === 'OL'
          ? `${Number(parent.getAttribute('start') || 1) + [...parent.children].indexOf(node)}. `
          : '- '
      const task = node.querySelector<HTMLInputElement>(':scope > input[type="checkbox"]')
      return `${prefix}${task ? (task.checked ? '[x] ' : '[ ] ') : ''}${body.trim().replace(/\n/g, '\n' + ' '.repeat(prefix.length))}\n`
    }
    if (tag === 'ul' || tag === 'ol') return `\n\n${body.trim()}\n\n`
    if (tag === 'blockquote')
      return `\n\n${body
        .trim()
        .split('\n')
        .map((line) => '> ' + line)
        .join('\n')}\n\n`
    if (tag === 'table') {
      const rows = [...node.querySelectorAll('tr')].filter((row) => range.intersectsNode(row))
      const lines = rows.map((row) => [...row.cells].map((cell) => visit(cell).trim().replace(/\n/g, ' ')))
      if (!lines.length) return ''
      const line = (cells: string[]) => '| ' + cells.join(' | ') + ' |'
      return `\n\n${[line(lines[0]), line(lines[0].map(() => '---')), ...lines.slice(1).map(line)].join('\n')}\n\n`
    }
    if (tag === 'p' || tag === 'div') return `\n\n${body.trim()}\n\n`
    return body
  }
  return visit(root).trim()
}

/** v2 is left untouched; migration retains excerpts, never full conversation snapshots. */
export function loadIndex(storage: Storage, key: string, legacy: string) {
  const markdown = storage.getItem(key)
  if (markdown !== null) return markdown
  const clips: unknown = JSON.parse(storage.getItem(legacy) || '[]')
  if (!Array.isArray(clips) || clips.some((c) => !c || typeof c.excerpt !== 'string'))
    throw new Error('Unreadable clippings')
  return clips.map((c: { excerpt: string }) => literalMarkdown(c.excerpt)).join('\n\n')
}
