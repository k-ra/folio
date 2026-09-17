import type { Attachment, Datum } from '../model/types'
import { MAX_ATTACHMENT_BYTES } from './limits'

/** CSV/TSV with quoted cells, escaped quotes, CRLF, and a numeric series selected by header. */
export function parseData(
  text: string,
  prompt = '',
  preferredColumn = '',
): { points: Datum[]; xLabel: string; yLabel: string } {
  const delimiter = text.split(/\r?\n/)[0].includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = [],
    cell = '',
    quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i <= src.length; i++) {
    const c = src[i]
    if (c === '"') {
      if (quoted && src[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = !quoted
    } else if ((c === delimiter || c === '\n' || c === undefined) && !quoted) {
      row.push(cell.trim())
      cell = ''
      if (c !== delimiter) {
        if (row.some(Boolean)) rows.push(row)
        row = []
      }
    } else if (c !== '\r' || quoted) {
      if (c !== undefined) cell += c
    }
  }
  if (quoted) throw new Error('An attachment has an unclosed quote. Check the CSV and try again.')
  if (rows.length < 2) throw new Error('Add a CSV or TSV with headers and at least one data row.')
  const [headers, ...body] = rows
  const numeric = (v: string | undefined) =>
    v !== undefined && v.trim() !== '' && Number.isFinite(Number(v.replace(/,/g, '')))
  const columns = headers.map((_, i) => i).filter((i) => body.some((r) => numeric(r[i])))
  // Numeric years / row IDs are usually labels, not the measure. Mentioning
  // "Median by Year" must not accidentally plot the year as the population.
  const measures = columns.filter(
    (i) => headers[i].trim() && !/^(?:year|date|index|id|unnamed(?:\W.*)?)$/i.test(headers[i]),
  )
  const candidates = measures.length ? measures : columns
  const matched = candidates.find(
    (i) => headers[i].trim() && prompt.toLowerCase().includes(headers[i].toLowerCase()),
  )
  const col =
    matched ??
    candidates.find((i) => headers[i] === preferredColumn) ??
    candidates.find((i) => i > 0) ??
    candidates[0]
  if (col === undefined) throw new Error('This file needs at least one numeric column to draw a chart.')
  // Research CSV exports often start with an unnamed row-index column.
  const namedLabel = headers.findIndex((h, i) => i !== col && h.trim() && !/^unnamed(?:\W|$)/i.test(h))
  const labelCol = namedLabel >= 0 ? namedLabel : col === 0 && headers.length > 1 ? 1 : 0
  const points = body
    .filter((r) => numeric(r[col]))
    .map((r, i) => ({ label: r[labelCol] || String(i + 1), value: Number(r[col].replace(/,/g, '')) }))
  if (points.length > 500) throw new Error('For this first pass, use a file with 500 or fewer data rows.')
  return { points, xLabel: headers[labelCol], yLabel: headers[col] }
}

export async function readAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('Choose an attachment up to 20 MB.')
  const isImage = /^image\/(png|jpeg|webp)$/.test(file.type)
  if (!isImage && !/\.(csv|tsv)$/i.test(file.name)) throw new Error('Use a CSV, TSV, PNG, JPG, or WebP file.')
  const content = isImage
    ? await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Could not read this image.'))
        reader.readAsDataURL(file)
      })
    : await file.text()
  return { id: crypto.randomUUID(), name: file.name, kind: isImage ? 'image' : 'data', content }
}
