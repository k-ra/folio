import { zipSync, strToU8 } from 'fflate'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import type { Story, Style } from '../model/types'
import { DEF_STYLE, FONT_NAMES } from '../model/constants'
import PublishedStory, { type Publication } from './PublishedStory'
import reader from 'virtual:folio-reader'
import fancyCss from '../fancy/fancy.css?raw'
import artifactCss from '../magic/artifact.css?raw'
import sans from '@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2?inline'
import caslon from '@fontsource/libre-caslon-text/files/libre-caslon-text-latin-400-normal.woff2?inline'
import news from '@fontsource/newsreader/files/newsreader-latin-400-normal.woff2?inline'
import archivo from '@fontsource/archivo/files/archivo-latin-400-normal.woff2?inline'
import mono from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?inline'

const fonts = [sans, caslon, news, archivo, mono]
const visualStyle = (s: Style): Style => {
  const {
    bodyFont,
    headerFont,
    size,
    gap,
    bg,
    ink,
    backdrop,
    backdropSrc,
    paper,
    strokeWidth,
    chartStyle,
    imageStyle,
    linkStyle,
    backgroundFrom,
    backgroundVia,
    backgroundTo,
    backgroundAngle,
    backgroundMotion,
    backgroundCode,
  } = s
  return {
    ...DEF_STYLE,
    bodyFont,
    headerFont,
    size,
    gap,
    bg,
    ink,
    backdrop,
    backdropSrc,
    paper,
    strokeWidth,
    chartStyle,
    imageStyle,
    linkStyle,
    backgroundFrom,
    backgroundVia,
    backgroundTo,
    backgroundAngle,
    backgroundMotion,
    backgroundCode,
  }
}
export function publication(s: Story, notes = false): Publication {
  return {
    title: s.title,
    formatting: Object.fromEntries(
      Object.entries(s.formatting || {}).filter(
        ([id]) => id === 'title' || s.blocks.some((b) => b.id === id || (notes && 'n-' + b.id === id)),
      ),
    ),
    style: visualStyle(s.style),
    notes: notes ? { ...s.notes } : {},
    sources: s.sources,
    blocks: s.blocks.flatMap((b): Publication['blocks'] => {
      if (b.type === 'magic') {
        const r = b.revisions[b.revision]
        if (!r) return []
        const { reply: _reply, ...output } = r.output as typeof r.output & {
          reply?: string
        }
        return [
          {
            id: b.id,
            type: 'artifact',
            output,
            style: visualStyle(r.style),
            fullBleed: b.layout === 'full-bleed',
          },
        ]
      }
      if (b.type === 'graphic') return [] // Migrated to a structured artifact when opened.
      if (b.type === 'fancy') return [{ id: b.id, type: 'fancy', text: b.text, fancy: b.fancy }]
      return [b]
    }),
  }
}
const css = `*{box-sizing:border-box}body{margin:0}button{font:inherit;color:inherit;border:0;background:none;cursor:pointer}p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}figure{margin:0}img,svg{display:block;max-width:100%;height:auto}iframe{border:0;width:100%}.publication{position:relative;display:grid;grid-template-columns:minmax(24px,1fr) minmax(0,560px) minmax(24px,1fr);row-gap:var(--gap);padding:110px 0 100px;line-height:1.75}.publication>*{grid-column:2;position:relative;min-width:0}.publication h1{font-size:32px;line-height:1.15;letter-spacing:-.4px;margin:0 0 12px;white-space:pre-wrap;overflow-wrap:anywhere}.publication .bleed{grid-column:1/-1}.publication .bleed figcaption{max-width:560px;margin-inline:auto}.publication.paper:before{content:'';position:absolute;top:85px;bottom:70px;width:min(608px,100%);left:50%;transform:translateX(-50%);background:var(--paper);box-shadow:0 20px 60px #0002}.publication-note{font-size:12px;opacity:.65;white-space:pre-wrap;margin-top:16px}.publication figcaption,.publication footer{font-size:11px;opacity:.65}.artifact-image{width:100%;object-fit:contain}.chart-heading{display:flex;justify-content:space-between;font-size:11px}.artifact-frame{display:block}.page-backdrop iframe{height:100%}.fancy-pause{font-size:11px}a{color:inherit}@keyframes drift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}@media(min-width:1000px){.publication-note{position:absolute;left:calc(100% + 28px);top:0;width:160px;margin:0}.bleed .publication-note{position:static;margin:16px auto;max-width:560px;width:auto}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}`
export function externalDependencies(s: Story): string[] {
  const urls = new Set<string>()
  const inspect = (v: unknown): void => {
    if (typeof v === 'string')
      for (const match of v.matchAll(/(?:https?:\/\/|blob:)[^\s"'<>\\)]+/g)) urls.add(match[0])
    else if (Array.isArray(v)) v.forEach(inspect)
    else if (v && typeof v === 'object') Object.values(v).forEach(inspect)
  }
  // Sources are intentional outbound citations, not runtime dependencies.
  inspect({ ...publication(s), sources: undefined })
  return [...urls]
}
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
export function htmlDocument(p: Publication, dependencies: string[] = []): string {
  const json = JSON.stringify(p)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: 'self'; font-src data:; frame-src 'self' data: about:; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(p.title)}</title><style>${FONT_NAMES.map((name, i) => `@font-face{font-family:'${name}';src:url('${fonts[i]}') format('woff2');font-weight:400}`).join('')}${css}${artifactCss}${fancyCss}</style></head><body style="background:${escape(p.style.bg)}">${dependencies.length ? `<details><summary>External dependencies (not bundled; may be unavailable offline)</summary><pre>${escape(dependencies.join('\n'))}</pre></details>` : ''}<div id="folio-reader">${renderToString(createElement(PublishedStory, { story: p }))}</div><script type="application/json" id="folio-data">${json}</script><script>${reader.replace(/<\/script/gi, '<\\/script')}</script></body></html>`
}
export function exportHtml(s: Story, notes = false) {
  return htmlDocument(publication(s, notes), externalDependencies(s))
}
export function exportZip(s: Story, notes = false) {
  const assets: Record<string, Uint8Array> = {},
    byUri = new Map<string, string>()
  const collect = (value: unknown): unknown => {
    if (typeof value === 'string' && /^data:(image|video|audio)\/[^;,]+;base64,/.test(value)) {
      const existing = byUri.get(value)
      if (existing) return existing
      const [, mime, base64] = value.match(/^data:([^;,]+);base64,(.*)$/s)!
      const ext: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/gif': 'gif',
        'video/mp4': 'mp4',
        'audio/mpeg': 'mp3',
      }
      const name = `assets/${byUri.size + 1}.${ext[mime] || 'bin'}`
      assets[name] = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      byUri.set(value, name)
      return name
    }
    if (Array.isArray(value)) return value.map(collect)
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, collect(v)]))
    return value
  }
  const p = collect(publication(s, notes)) as Publication
  for (const block of s.blocks)
    if (block.type === 'magic' && block.revision >= 0) {
      for (const file of block.attachments)
        if (file.kind === 'data') {
          const safeName = file.name.replace(/[^\p{L}\p{N}._-]/gu, '_') || 'data.csv'
          assets[
            `datasets/${block.id.replace(/[^a-z0-9_-]/gi, '_')}-${file.id.replace(/[^a-z0-9_-]/gi, '_')}-${safeName}`
          ] = strToU8(file.content)
        }
    }
  return zipSync(
    {
      ...assets,
      'index.html': strToU8(htmlDocument(p, externalDependencies(s))),
    },
    { level: 6 },
  )
}

/** Publications choose a container; backups retain the complete editable source. */
export async function publicationDownload(story: Story, notes = false) {
  const s = structuredClone(story)
  const missing: string[] = []
  const embed = async (src: string): Promise<string> => {
    if (!/^(https?:|blob:)/.test(src)) return src
    try {
      const response = await fetch(src, {
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) throw new Error('Unavailable')
      const blob = await response.blob()
      if (!/^image\//.test(blob.type) || blob.size > 40 * 1024 * 1024) throw new Error('Unsupported media')
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch {
      missing.push(src)
      return src
    }
  }
  // Only published media: never follow links in private notes, chat or prompts.
  for (const b of s.blocks) {
    if (b.type === 'media' && b.src) b.src = await embed(b.src)
    if (b.type === 'magic') {
      const output = b.revisions[b.revision]?.output
      if (output?.kind === 'image') output.src = await embed(output.src)
    }
  }
  if (s.style.backdrop === 'image' && s.style.backdropSrc)
    s.style.backdropSrc = await embed(s.style.backdropSrc)
  const visual = JSON.stringify(publication(s, notes))
  const hasAssets =
    /data:(image|video|audio)\//.test(visual) ||
    s.blocks.some(
      (b) =>
        (b.type === 'media' && !!b.src) ||
        (b.type === 'magic' &&
          (b.revisions[b.revision]?.output.kind === 'image' ||
            (b.revision >= 0 && b.attachments.some((a) => a.kind === 'data')))),
    ) ||
    s.style.backdrop === 'image'
  const dependencies = externalDependencies(s)
  return {
    data: hasAssets ? exportZip(s, notes) : exportHtml(s, notes),
    type: hasAssets ? 'application/zip' : 'text/html',
    extension: hasAssets ? '.zip' : '.html',
    notice:
      missing.length || dependencies.length
        ? 'Downloaded. External dependencies that could not be bundled are listed in the HTML.'
        : hasAssets
          ? 'Downloaded with assets. Open index.html from the unzipped folder.'
          : 'Downloaded.',
  }
}
