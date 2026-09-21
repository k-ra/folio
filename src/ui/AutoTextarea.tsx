import { forwardRef, useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from 'react'
import RichInput, { type Promotion } from '../text/RichInput'
import { formatShortcut, type TextMark } from '../text/formatting'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  'data-id'?: string
  rich?: {
    marks?: TextMark[]
    onChange: (text: string, marks: TextMark[]) => void
  }
  markdown?: boolean
}

/** A chrome-less textarea that grows with its content. */
const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function AutoTextarea(props, ref) {
  const [promotion, promote] = useState<Promotion>()
  const wasRich = useRef(false)
  if (props.rich && (props.rich.marks?.length || promotion)) wasRich.current = true
  if (props.rich && wasRich.current)
    return <RichInput props={props} forwardedRef={ref} promotion={promotion} />
  const { rich, markdown, ...plain } = props
  return (
    <PlainTextarea
      {...plain}
      ref={ref}
      data-folio-input
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
          const token = { bold: '**', italic: '*', strike: '~~', code: '`' }[kind]
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
})
const PlainTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function PlainTextarea(props, ref) {
  const inner = useRef<HTMLTextAreaElement | null>(null)
  const setRef = (el: HTMLTextAreaElement | null) => {
    inner.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = el.scrollHeight + 'px'
  })
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const fit = () => {
      el.style.height = '0px'
      el.style.height = el.scrollHeight + 'px'
    }
    window.addEventListener('resize', fit)
    document.fonts?.ready.then(fit)
    // The column width animates when a panel opens; refit as it changes.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    ro?.observe(el)
    return () => {
      window.removeEventListener('resize', fit)
      ro?.disconnect()
    }
  }, [])
  return <textarea rows={1} {...props} ref={setRef} />
})

export default AutoTextarea
