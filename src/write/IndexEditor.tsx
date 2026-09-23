import { Editor, type JSONContent } from '@tiptap/core'
import { useLayoutEffect, useRef } from 'react'
import { formatShortcut } from '../text/formatting'
import { indexExtensions } from '../text/indexDocument'
export { indexExtensions, emptyIndex, indexFromMarkdown, readIndexDocument } from '../text/indexDocument'

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
