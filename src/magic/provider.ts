import type { ArtifactOutput } from '../model/types'
import { parseData } from './data'
import type { GenerateRequest } from './contract'
import { apiFetch } from '../ai/session'

export const generationMode = (provider: 'preview' | 'connected' | undefined, configured: boolean) =>
  provider ?? (configured ? 'connected' : 'preview')

export interface ArtifactProvider {
  generate(request: GenerateRequest, signal: AbortSignal): Promise<ArtifactOutput>
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const pause = (signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Cancelled', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, 1800)
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })

function dataOutput(r: GenerateRequest): ArtifactOutput {
  const file = r.attachments.find((a) => a.kind === 'data')
  const previous = r.previous?.kind === 'chart' ? r.previous : undefined
  if (!file && !previous) throw new Error('Attach your CSV or TSV to draw from real data.')
  const parsed = file ? parseData(file.content, r.instruction, previous?.yLabel) : previous!
  const style = /\bbar/.test(r.instruction.toLowerCase())
    ? 'bar'
    : /\barea/.test(r.instruction.toLowerCase())
      ? 'area'
      : /\bline/.test(r.instruction.toLowerCase())
        ? 'line'
        : previous?.chartStyle || r.style.chartStyle
  const caption = /^(caption|title|call it)[:\s]+/i.test(r.instruction)
    ? r.instruction.replace(/^(caption|title|call it)[:\s]+/i, '')
    : previous?.caption || `${parsed.yLabel}, by ${parsed.xLabel.toLowerCase()}`
  return {
    kind: 'chart',
    ...parsed,
    chartStyle: style,
    caption,
    demo: (!file && previous?.demo) || undefined,
  }
}

/** Deterministic offline samples. They are explicitly labeled in the UI. */
export const previewProvider: ArtifactProvider = {
  async generate(r, signal) {
    await pause(signal)
    if (r.mode === 'data') return dataOutput(r)
    const caption = /^(caption|title|call it)[:\s]+/i.test(r.instruction)
      ? r.instruction.replace(/^(caption|title|call it)[:\s]+/i, '')
      : r.originalPrompt || r.instruction
    if (r.mode === 'image') {
      const reference = r.attachments.find((a) => a.kind === 'image')
      const ink = escape(r.style.ink),
        bg = escape(r.style.bg)
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="560" viewBox="0 0 900 560"><rect width="900" height="560" fill="${bg}"/><g fill="none" stroke="${ink}" stroke-width="${r.style.strokeWidth * 1.5}">${Array.from({ length: 32 }, (_, i) => `<path d="M 80 ${400 + i * 3} Q ${220 + i * 5} ${10 + i * 9}, 450 ${230 + i * 4} T 820 ${140 + i * 9}"/>`).join('')}<circle cx="660" cy="150" r="46"/></g></svg>`
      return {
        kind: 'image',
        src: reference?.content || `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        caption,
        demo: true,
      }
    }
    return {
      kind: 'html',
      caption,
      demo: true,
      html: `<style>body{margin:0;padding:32px;font:14px 'Instrument Sans',sans-serif;color:${escape(r.style.ink)};background:${escape(r.style.bg)}}label{display:flex;justify-content:space-between;gap:20px;font-size:11px}input{width:140px;accent-color:currentColor}svg{width:100%;height:220px}path,circle{fill:none;stroke:currentColor;stroke-width:${r.style.strokeWidth}}p{opacity:.55;font-size:11px}</style><label>Amplitude <input aria-label="Amplitude" type="range" min="5" max="85" value="40"/></label><svg viewBox="0 0 520 220"><path d="M20 110 H500" opacity=".2"/><g id="waves"></g></svg><p>Move the slider to explore the local sample.</p><script>const input=document.querySelector('input'),g=document.querySelector('#waves');function draw(){g.innerHTML=Array.from({length:12},(_,i)=>'<path d="M20 '+(100+i*2)+' Q145 '+(100-Number(input.value)-i*2)+' 260 '+(100+i*2)+' T500 '+(100+i*2)+'"/>').join('')}input.oninput=draw;draw()</script>`,
    }
  },
}

export const connectedProvider: ArtifactProvider = {
  async generate(request, signal) {
    const response = await apiFetch('/api/magic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.error || 'Generation could not finish. Your previous version is still here.')
    }
    const output: ArtifactOutput = await response.json()
    if (
      !output ||
      !['image', 'html'].includes(output.kind) ||
      typeof output.caption !== 'string' ||
      (output.kind === 'html' && typeof output.html !== 'string') ||
      (output.kind === 'html' && output.reply !== undefined && typeof output.reply !== 'string') ||
      (output.kind === 'image' && !/^data:image\/(png|jpeg|webp);base64,/.test(output.src))
    )
      throw new Error('The generator returned an unsupported artifact. Please retry.')
    return output
  },
}
