import {
  forwardRef,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from 'react'
import RichInput, { type Promotion } from '../text/RichInput'
import { formatShortcut, type TextMark } from '../text/formatting'
import { textareaSizer } from './textareaSize'
import { SelectionContext } from '../write/EssaySelection'
import FormattedText from '../text/FormattedText'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  'data-id'?: string
  'data-story-field'?: boolean
  rich?: {
    marks?: TextMark[]
    onChange: (text: string, marks: TextMark[]) => void
  }
  markdown?: boolean
}

/** A chrome-less textarea that grows with its content. */
const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function AutoTextarea(props, ref) {
  const selection = useContext(SelectionContext)
  const id = props['data-id']
  const author = !!props.rich && !!id && !id.startsWith('n-')
  const [promotion, promote] = useState<Promotion>()
  const wasRich = useRef(false)
  useEffect(() => {
    if (promotion) promote(undefined)
  }, [promotion])
  if (props.rich && (props.rich.marks?.length || promotion)) wasRich.current = true
  const selecting = selection.active && author
  const style = selecting ? { ...props.style, display: 'none' } : props.style
  const { rich, markdown, ...plain } = props
  const editor =
    props.rich && wasRich.current ? (
      <RichInput
        props={{ ...props, style, 'data-story-field': author || undefined }}
        forwardedRef={ref}
        promotion={promotion}
      />
    ) : (
      <PlainTextarea
        {...plain}
        style={style}
        ref={ref}
        data-folio-input
        data-story-field={author || undefined}
        onKeyDown={(e) => {
          const kind = !e.nativeEvent.isComposing && formatShortcut(e)
          if (rich && kind) {
            e.preventDefault()
            promote({
              from: e.currentTarget.selectionStart,
              to: e.currentTarget.selectionEnd,
              kind,
            })
          } else if (markdown && kind && kind !== 'underline') {
            e.preventDefault()
            const el = e.currentTarget,
              from = el.selectionStart,
              to = el.selectionEnd
            const token = {
              bold: '**',
              italic: '*',
              strike: '~~',
              code: '`',
            }[kind]
            // Native insertion keeps textarea undo and React's input notification intact.
            const replacement = token + el.value.slice(from, to) + token
            if (!document.execCommand('insertText', false, replacement)) {
              el.setRangeText(replacement, from, to, 'end')
              props.onChange?.({
                ...e,
                currentTarget: el,
                target: el,
              } as unknown as React.ChangeEvent<HTMLTextAreaElement>)
            }
            el.setSelectionRange(from + token.length, to + token.length)
          } else props.onKeyDown?.(e)
        }}
      />
    )
  // Keep the editor mounted: temporarily selecting across paragraphs must not
  // discard native/Tiptap undo history or replay a formatting shortcut.
  return (
    <>
      {editor}
      {selecting && (
        <div
          data-story-text
          data-id={id}
          className={`selection-text ${props.className || ''}`}
          style={props.style}
          onClick={(e) => {
            if (getSelection()?.isCollapsed) selection.resume(id!, e.clientX, e.clientY)
          }}
        >
          <FormattedText text={String(props.value || '')} marks={props.rich?.marks} />
        </div>
      )}
    </>
  )
})
const PlainTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function PlainTextarea(props, ref) {
  const inner = useRef<HTMLTextAreaElement | null>(null)
  const sizer = useRef<ReturnType<typeof textareaSizer>>()
  const setRef = (el: HTMLTextAreaElement | null) => {
    inner.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const measure = textareaSizer(el)
    sizer.current = measure
    const fit = () => measure.fit()
    const fontFit = () => measure.fit(true)
    fit()
    window.addEventListener('resize', fit)
    document.fonts?.ready.then(fontFit)
    document.fonts?.addEventListener('loadingdone', fontFit)
    // The column width animates when a panel opens; refit as it changes.
    let width = el.getBoundingClientRect().width
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            const next = el.getBoundingClientRect().width
            if (next === width) return
            width = next
            fit()
          })
        : null
    ro?.observe(el)
    return () => {
      window.removeEventListener('resize', fit)
      document.fonts?.removeEventListener('loadingdone', fontFit)
      ro?.disconnect()
      measure.dispose()
      sizer.current = undefined
    }
  }, [])
  // Check text and computed typography; unrelated hover/save renders make no writes.
  useLayoutEffect(() => sizer.current?.fit())
  return <textarea rows={1} {...props} ref={setRef} />
})

export default AutoTextarea
