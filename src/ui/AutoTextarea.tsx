import { forwardRef, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { 'data-id'?: string }

/** A chrome-less textarea that grows with its content. */
const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea(props, ref) {
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
