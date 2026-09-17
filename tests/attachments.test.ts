import { describe, expect, it } from 'vitest'
import type { Attachment } from '../src/model/types'
import { attachmentBytes, MAX_ATTACHMENT_BYTES, validateAttachments } from '../src/magic/limits'
import { readAttachment } from '../src/magic/data'

const data = (content: string): Attachment => ({ id: 'csv', name: 'data.csv', kind: 'data', content })

describe('attachment budgets are shared by upload and server validation', () => {
  it('accepts an attachment larger than the old 2 MB limit', async () => {
    const content = 'x'.repeat(3 * 1024 * 1024)
    const file = {
      name: 'large.csv',
      type: 'text/csv',
      size: content.length,
      text: async () => content,
    } as File
    expect((await readAttachment(file)).content.length).toBe(content.length)
    expect(() => validateAttachments([data(content)])).not.toThrow()
  })
  it('accepts 20 MB exactly and rejects oversized files before reading', async () => {
    expect(() => validateAttachments([data('x'.repeat(MAX_ATTACHMENT_BYTES))])).not.toThrow()
    expect(() => validateAttachments([data('x'.repeat(MAX_ATTACHMENT_BYTES + 1))])).toThrow('20 MB')
    await expect(readAttachment({ size: MAX_ATTACHMENT_BYTES + 1 } as File)).rejects.toThrow('20 MB')
  })
  it('enforces four attachments and a 40 MB combined budget', () => {
    const full = data('x'.repeat(MAX_ATTACHMENT_BYTES))
    expect(() => validateAttachments([full, full])).not.toThrow()
    expect(() => validateAttachments([full, full, data('x')])).toThrow('40 MB')
    expect(() => validateAttachments(Array(5).fill(data('x')))).toThrow('four')
  })
  it('counts UTF-8 data and decoded image bytes, not base64 characters', () => {
    expect(attachmentBytes(data('🐳'))).toBe(4)
    const image = { ...data(''), kind: 'image' as const }
    expect(attachmentBytes({ ...image, content: 'data:image/png;base64,YQ==' })).toBe(1)
    expect(attachmentBytes({ ...image, content: 'data:image/png;base64,YWI=' })).toBe(2)
    expect(attachmentBytes({ ...image, content: 'data:image/png;base64,YWJj' })).toBe(3)
    expect(() => validateAttachments([data('🐳'.repeat(MAX_ATTACHMENT_BYTES / 4 + 1))])).toThrow('20 MB')
  })
})
