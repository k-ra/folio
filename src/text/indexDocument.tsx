import { Node, generateJSON, getSchema, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from './Markdown'
import { indexDocumentSchema } from './indexSchema'

// Retain clipped tables without adding table toolbars or layout controls.
const Table = Node.create({
  name: 'indexTable',
  group: 'block',
  content: 'indexRow+',
  isolating: true,
  parseHTML: () => [{ tag: 'table' }],
  renderHTML: () => ['table', ['tbody', 0]],
})
const Row = Node.create({
  name: 'indexRow',
  content: '(indexCell | indexHeader)+',
  parseHTML: () => [{ tag: 'tr' }],
  renderHTML: () => ['tr', 0],
})
const cell = (name: string, tag: string) =>
  Node.create({
    name,
    content: 'block+',
    isolating: true,
    parseHTML: () => [{ tag }],
    renderHTML: () => [tag, 0],
  })
const Checkbox = Node.create({
  name: 'indexCheckbox',
  inline: true,
  group: 'inline',
  atom: true,
  addAttributes: () => ({ checked: { default: false, parseHTML: (el) => el.hasAttribute('checked') } }),
  parseHTML: () => [{ tag: 'input[type="checkbox"]' }],
  renderHTML: ({ node }) => [
    'input',
    { type: 'checkbox', disabled: '', ...(node.attrs.checked ? { checked: '' } : {}) },
  ],
})
export const indexExtensions = () => [
  StarterKit.configure({
    link: { openOnClick: false, autolink: false },
    trailingNode: false,
  }),
  Table,
  Row,
  cell('indexCell', 'td'),
  cell('indexHeader', 'th'),
  Checkbox,
]
export const emptyIndex = (): JSONContent => ({ type: 'doc', content: [{ type: 'paragraph' }] })
export function indexFromMarkdown(markdown: string): JSONContent {
  return markdown.trim()
    ? generateJSON(renderToStaticMarkup(<Markdown>{markdown}</Markdown>), indexExtensions())
    : emptyIndex()
}
export function readIndexDocument(value: string): JSONContent {
  const doc = getSchema(indexExtensions()).nodeFromJSON(indexDocumentSchema.parse(JSON.parse(value)))
  doc.check()
  if (doc.type.name !== 'doc') throw new Error('Invalid index')
  return doc.toJSON()
}
