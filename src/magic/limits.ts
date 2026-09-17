import type { Attachment } from '../model/types.js'

const MB = 1024 * 1024
export const MAX_ATTACHMENT_BYTES = 20 * MB
export const MAX_BLOCK_ATTACHMENT_BYTES = 40 * MB
export const MAX_ATTACHMENT_COUNT = 4
// Allow JSON/base64 overhead and the preceding artifact when editing.
export const MAX_GENERATION_REQUEST_BYTES = 64 * MB

export function attachmentBytes(attachment: Attachment): number {
  if (attachment.kind === 'image') {
    const data = attachment.content.slice(attachment.content.indexOf(',') + 1)
    return Math.floor((data.length * 3) / 4) - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0)
  }
  return new TextEncoder().encode(attachment.content).byteLength
}

export function validateAttachments(attachments: Attachment[]): void {
  if (attachments.length > MAX_ATTACHMENT_COUNT) throw new Error('Keep up to four attachments in a block.')
  let total = 0
  for (const attachment of attachments) {
    if (
      !attachment ||
      typeof attachment.content !== 'string' ||
      typeof attachment.name !== 'string' ||
      !['image', 'data'].includes(attachment.kind)
    )
      throw new Error('An attachment is invalid. Remove it and attach the file again.')
    const bytes = attachmentBytes(attachment)
    if (bytes > MAX_ATTACHMENT_BYTES) throw new Error('Choose attachments up to 20 MB each.')
    total += bytes
  }
  if (total > MAX_BLOCK_ATTACHMENT_BYTES) throw new Error('Keep attachments under 40 MB total per block.')
}
