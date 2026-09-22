export type Citation = { type: string; start_index?: number; end_index?: number; url?: string }

export function safeCitationUrl(value: string | undefined) {
  try {
    const url = new URL(value || '')
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    return url.href.replace(/[<>()[\]\\]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)
  } catch {
    return null
  }
}

/** Provider annotations become portable Markdown, never executable HTML. */
export function citedText(text: string, annotations: Citation[] = []) {
  const citations = annotations.flatMap((a) => {
    const href = a.type === 'url_citation' && safeCitationUrl(a.url)
    return href ? [{ start: a.start_index, end: a.end_index, href }] : []
  })
  const suffix: string[] = []
  let limit = text.length
  let result = text
  for (const [i, c] of citations
    .map((c, i) => [i, c] as const)
    .sort((a, b) => (b[1].start ?? -1) - (a[1].start ?? -1))) {
    const link = ` [${i + 1}](<${c.href}>)`
    if (
      Number.isInteger(c.start) &&
      Number.isInteger(c.end) &&
      c.start! >= 0 &&
      c.end! > c.start! &&
      c.end! <= limit
    ) {
      result = result.slice(0, c.start) + link + result.slice(c.end)
      limit = c.start!
    } else suffix.push(link)
  }
  return result + (suffix.length ? '\n\nSources:' + suffix.join('') : '')
}
