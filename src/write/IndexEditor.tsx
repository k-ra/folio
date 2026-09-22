import { Editor, Node, generateJSON, getSchema, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { renderToStaticMarkup } from 'react-dom/server'
import { useLayoutEffect, useRef } from 'react'
import Markdown from '../text/Markdown'
import { formatShortcut } from '../text/formatting'

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
  const doc = getSchema(indexExtensions()).nodeFromJSON(JSON.parse(value))
  doc.check()
  if (doc.type.name !== 'doc') throw new Error('Invalid index')
  return doc.toJSON()
}

/** The same rich document is both the reading surface and the editing surface. */
export default function IndexEditor({
  value,
  onChange,
}: {
  value: JSONContent
  onChange: (value: JSONContent) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const editor = useRef<Editor>()
  const latest = useRef(onChange)
  latest.current = onChange
  useLayoutEffect(() => {
    const instance: Editor = new Editor({
      element: host.current!,
      extensions: indexExtensions(),
      content: value,
      enableInputRules: false,
      enablePasteRules: false,
      editorProps: {
        attributes: {
          class: 'folio-markdown index-editor',
          role: 'textbox',
          'aria-label': 'Index',
          'aria-multiline': 'true',
        },
        handleKeyDown: (_view, event) => {
          const kind = !event.isComposing && formatShortcut(event)
          if (!kind) return false
          event.preventDefault()
          return instance.commands.toggleMark(kind)
        },
      },
      onUpdate: ({ editor: e }) => latest.current(e.getJSON()),
    })
    editor.current = instance
    return () => {
      instance.destroy()
      editor.current = undefined
    }
  }, [])
  useLayoutEffect(() => {
    const e = editor.current
    // Autosaves must not recreate the document, selection, undo stack, or scroll position.
    if (e && JSON.stringify(e.getJSON()) !== JSON.stringify(value))
      e.commands.setContent(value, { emitUpdate: false })
  }, [value])
  return <div className="index-excerpt" ref={host} />
}
