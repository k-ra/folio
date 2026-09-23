import { z } from 'zod'
import type { JSONContent } from '@tiptap/core'

const attributes = z.object({
  level: z.number().int().min(1).max(6).optional(),
  start: z.number().int().optional(),
  type: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  checked: z.boolean().optional(),
  href: z
    .string()
    .refine((s) => /^(https?:|mailto:|tel:|#|\/)/i.test(s), 'Unsafe Index link')
    .optional(),
  target: z.enum(['_blank', '_self']).nullable().optional(),
  rel: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  class: z.string().nullable().optional(),
})
const node: z.ZodType<JSONContent> = z.lazy(() =>
  z.object({
    type: z.enum([
      'doc',
      'paragraph',
      'text',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'blockquote',
      'codeBlock',
      'hardBreak',
      'horizontalRule',
      'indexTable',
      'indexRow',
      'indexCell',
      'indexHeader',
      'indexCheckbox',
    ]),
    text: z.string().optional(),
    attrs: attributes.optional(),
    marks: z
      .array(
        z.object({
          type: z.enum(['bold', 'italic', 'underline', 'strike', 'code', 'link']),
          attrs: attributes.optional(),
        }),
      )
      .optional(),
    content: z.array(node).optional(),
  }),
)

/** Only rich prose—not arbitrary HTML, executable nodes or credential metadata. */
export const indexDocumentSchema = node.refine((doc) => doc.type === 'doc', 'Invalid Index document')
