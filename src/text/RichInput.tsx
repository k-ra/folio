import { Editor, Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Fragment, Slice } from '@tiptap/pm/model'
import { useLayoutEffect, useRef, type ForwardedRef, type KeyboardEvent } from 'react'
import { formatShortcut, readTextDocument, textDocument, type MarkKind } from './formatting'
import type { TextareaProps } from '../ui/AutoTextarea'
import './text.css'

const Document = Node.create({
  name: 'doc',
  topNode: true,
  content: 'paragraph',
})
export interface Promotion {
  from: number
  to: number
  kind: MarkKind
}

/** Keeps the existing field's value/selection/focus contract while ProseMirror owns rich editing. */
export default function RichInput({
  props,
  forwardedRef,
  promotion,
}: {
  props: TextareaProps
  forwardedRef: ForwardedRef<HTMLTextAreaElement>
  promotion?: Promotion
}) {
  const host = useRef<HTMLDivElement>(null),
    editor = useRef<Editor>()
  const latest = useRef(props)
  const firstSync = useRef(true)
  latest.current = props
  const {
    value,
    rich,
    onChange: _onChange,
    onKeyDown: _onKeyDown,
    onSelect,
    onFocus,
    onBlur,
    className,
    style,
    placeholder,
    disabled,
    readOnly,
    rows: _rows,
    ...rest
  } = props
  useLayoutEffect(() => {
    firstSync.current = true
    const root = host.current!
    const instance: Editor = new Editor({
      element: root,
      extensions: [
        Document,
        StarterKit.configure({
          document: false,
          heading: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          listKeymap: false,
          blockquote: false,
          horizontalRule: false,
          codeBlock: false,
          link: false,
          dropcursor: false,
          gapcursor: false,
          trailingNode: false,
        }),
      ],
      enableInputRules: false, // Authors' literal punctuation stays literal; shortcuts apply formatting.
      enablePasteRules: false,
      content: textDocument(String(props.value || ''), props.rich?.marks),
      editorProps: {
        handleKeyDown: (_view, event) => event.defaultPrevented,
        // Fit multi-paragraph clipboard content into a Folio field without dropping words or marks.
        transformPasted: (slice) => {
          const parsed = readTextDocument({
            type: 'doc',
            content: slice.content.toJSON() || [],
          })
          const json = textDocument(parsed.text, parsed.marks).content![0].content!
          return new Slice(Fragment.fromArray(json.map((n) => instance.schema.nodeFromJSON(n))), 0, 0)
        },
      },
      onUpdate: ({ editor: e }) => {
        const next = readTextDocument(e.getJSON())
        root.dataset.empty = String(!next.text)
        latest.current.rich?.onChange(next.text, next.marks)
      },
    })
    editor.current = instance
    const read = () => readTextDocument(instance.getJSON()).text
    // The writing controller uses offsets in plain UTF-16 text; inline marks never change them.
    Object.defineProperties(root, {
      value: { configurable: true, get: read },
      selectionStart: {
        configurable: true,
        get: () => instance.state.selection.from - 1,
      },
      selectionEnd: {
        configurable: true,
        get: () => instance.state.selection.to - 1,
      },
      setSelectionRange: {
        configurable: true,
        value: (from: number, to: number) =>
          instance.commands.setTextSelection({ from: from + 1, to: to + 1 }),
      },
      focus: { configurable: true, value: () => instance.view.focus() },
      blur: { configurable: true, value: () => instance.commands.blur() },
    })
    if (typeof forwardedRef === 'function') forwardedRef(root as unknown as HTMLTextAreaElement)
    else if (forwardedRef) forwardedRef.current = root as unknown as HTMLTextAreaElement
    if (promotion) {
      instance.view.focus()
      instance
        .chain()
        .setTextSelection({ from: promotion.from + 1, to: promotion.to + 1 })
        .toggleMark(promotion.kind)
        .run()
    }
    return () => {
      if (typeof forwardedRef === 'function') forwardedRef(null)
      else if (forwardedRef) forwardedRef.current = null
      instance.destroy()
      editor.current = undefined
    }
  }, [])
  useLayoutEffect(() => {
    const e = editor.current
    if (!e) return
    const next = textDocument(String(value || ''), rich?.marks)
    if (
      !firstSync.current &&
      JSON.stringify(readTextDocument(e.getJSON())) !== JSON.stringify(readTextDocument(next))
    )
      e.chain().setMeta('addToHistory', false).setContent(next, { emitUpdate: false }).run()
    firstSync.current = false
    e.setEditable(!disabled && !readOnly, false)
    e.setOptions({
      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': props['aria-label'] || placeholder || 'Writing',
          class: `rich-input ${className || ''}`,
          'data-placeholder': placeholder || '',
        },
      },
    })
  })
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return
    latest.current.onKeyDown?.(event as unknown as KeyboardEvent<HTMLTextAreaElement>)
    if (event.defaultPrevented) return
    const kind = formatShortcut(event)
    if (kind) {
      event.preventDefault()
      editor.current?.chain().toggleMark(kind).run()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      editor.current?.commands.setHardBreak()
    }
  }
  return (
    <div
      {...(rest as object)}
      ref={host}
      data-folio-input
      data-empty={!value}
      className="rich-field"
      style={style}
      onKeyDownCapture={keyDown}
      onFocus={onFocus as unknown as React.FocusEventHandler<HTMLDivElement>}
      onBlur={onBlur as unknown as React.FocusEventHandler<HTMLDivElement>}
      onSelect={onSelect as unknown as React.ReactEventHandler<HTMLDivElement>}
    />
  )
}
