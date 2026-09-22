import { createContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export const SelectionContext = createContext<{
  active: boolean
  resume: (id: string, x: number, y: number) => void
}>({ active: false, resume: () => {} })
const fields = () => [...document.querySelectorAll<HTMLElement>('.essay-main [data-story-text]')]
function point(el: Node, offset: number): [Node, number] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let text = walker.nextNode(),
    last: Node = el
  while (text) {
    if (offset <= (text.textContent || '').length) return [text, offset]
    offset -= (text.textContent || '').length
    last = text
    text = walker.nextNode()
  }
  return [last, last === el ? 0 : (last.textContent || '').length]
}
function at(x: number, y: number) {
  const all = fields()
  const el =
    all.find((e) => {
      const r = e.getBoundingClientRect()
      return y >= r.top && y <= r.bottom
    }) ||
    all.reduce<HTMLElement | undefined>(
      (best, e) =>
        !best || Math.abs(e.getBoundingClientRect().top - y) < Math.abs(best.getBoundingClientRect().top - y)
          ? e
          : best,
      undefined,
    )
  if (!el) return null
  const r = el.getBoundingClientRect()
  const caret = document.caretRangeFromPoint(
    Math.max(r.left + 1, Math.min(r.right - 1, x)),
    Math.max(r.top + 1, Math.min(r.bottom - 1, y)),
  )
  if (caret && el.contains(caret.startContainer)) {
    const prefix = document.createRange()
    prefix.selectNodeContents(el)
    prefix.setEnd(caret.startContainer, caret.startOffset)
    return { el, offset: prefix.toString().length }
  }
  return { el, offset: y < r.top ? 0 : (el.textContent || '').length }
}

/** Switch to native, cross-block text selection only when requested. No story mutation. */
export default function EssaySelection({ children, text }: { children: ReactNode; text: string }) {
  const [active, setActive] = useState(false)
  const state = useRef({ active: false, all: false, text })
  state.current = { ...state.current, active, text }
  const drag = useRef<{
    id: string
    offset: number | null
    top: number
    bottom: number
    startX: number
    startY: number
    x: number
    y: number
  } | null>(null)
  const applyDrag = () => {
    const d = drag.current,
      selection = getSelection()
    if (!d || !selection) return
    const start = fields().find((e) => e.dataset.id === d.id),
      end = at(d.x, d.y)
    if (d.offset === null) d.offset = at(d.startX, d.startY)?.offset || 0
    if (start && end) selection.setBaseAndExtent(...point(start, d.offset), ...point(end.el, end.offset))
  }
  const resume = (id: string, x: number, y: number) => {
    const offset = at(x, y)?.offset || 0
    setActive(false)
    state.current.all = false
    requestAnimationFrame(() => {
      const el = [...document.querySelectorAll<HTMLTextAreaElement>('[data-story-field]')].find(
        (e) => e.dataset.id === id,
      )
      el?.focus({ preventScroll: true })
      el?.setSelectionRange(offset, offset)
    })
  }
  useLayoutEffect(() => {
    if (!active) return
    const all = fields(),
      selection = getSelection()
    if (state.current.all && all.length && selection) {
      const range = document.createRange()
      range.setStart(...point(all[0], 0))
      range.setEnd(...point(all[all.length - 1], Infinity))
      selection.removeAllRanges()
      selection.addRange(range)
    } else applyDrag()
    document.querySelector('.essay-main')?.classList.add('essay-selecting')
    return () => document.querySelector('.essay-main')?.classList.remove('essay-selecting')
  }, [active])
  useEffect(() => {
    let frame = 0
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const inWriting = !!el.closest('.essay-main [data-story-field], .essay-main [data-story-text]')
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && (inWriting || state.current.active)) {
        e.preventDefault()
        e.stopPropagation()
        state.current.all = true
        drag.current = null
        if (state.current.active) {
          const all = fields()
          const r = document.createRange()
          r.setStart(...point(all[0], 0))
          r.setEnd(...point(all[all.length - 1], Infinity))
          getSelection()?.removeAllRanges()
          getSelection()?.addRange(r)
        } else setActive(true)
      }
      if (e.key === 'Escape' && state.current.active) {
        e.preventDefault()
        setActive(false)
        getSelection()?.removeAllRanges()
      }
    }
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (state.current.active) {
        const field = target.closest<HTMLElement>('[data-story-text]')
        if (!field) {
          setActive(false)
          return
        }
        // Let ordinary native dragging work on the shared selection surface.
        state.current.all = false
        return
      }
      const field = target.closest<HTMLTextAreaElement>('[data-story-field]')
      if (!field) return
      const r = field.getBoundingClientRect()
      drag.current = {
        id: field.dataset.id!,
        offset: null,
        top: r.top,
        bottom: r.bottom,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
      }
    }
    const autoScroll = () => {
      const d = drag.current
      if (!d || !state.current.active) return
      const delta = d.y < 32 ? -14 : d.y > innerHeight - 32 ? 14 : 0
      if (delta) {
        window.scrollBy(0, delta)
        applyDrag()
      }
      frame = requestAnimationFrame(autoScroll)
    }
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d || !(e.buttons & 1)) return
      d.x = e.clientX
      d.y = e.clientY
      if (state.current.active) {
        e.preventDefault()
        applyDrag()
      } else if (e.clientY < d.top || e.clientY > d.bottom) {
        state.current.all = false
        setActive(true)
        frame = requestAnimationFrame(autoScroll)
      }
    }
    const up = () => {
      drag.current = null
      cancelAnimationFrame(frame)
    }
    const copy = (e: ClipboardEvent) => {
      if (!state.current.active) return
      const selection = getSelection()
      if (!selection?.rangeCount || selection.isCollapsed) return
      const range = selection.getRangeAt(0)
      const all = fields()
      if (!all.length) return
      const whole = document.createRange()
      whole.setStart(...point(all[0], 0))
      whole.setEnd(...point(all[all.length - 1], Infinity))
      const coversAll =
        range.compareBoundaryPoints(Range.START_TO_START, whole) <= 0 &&
        range.compareBoundaryPoints(Range.END_TO_END, whole) >= 0
      const parts = all
        .filter((el) => range.intersectsNode(el))
        .map((el) => {
          const sub = document.createRange()
          sub.selectNodeContents(el)
          if (range.compareBoundaryPoints(Range.START_TO_START, sub) > 0)
            sub.setStart(range.startContainer, range.startOffset)
          if (range.compareBoundaryPoints(Range.END_TO_END, sub) < 0)
            sub.setEnd(range.endContainer, range.endOffset)
          return sub.toString()
        })
      e.preventDefault()
      e.clipboardData?.setData(
        'text/plain',
        coversAll ? state.current.text : parts.filter(Boolean).join('\n\n'),
      )
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
    document.addEventListener('copy', copy)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('copy', copy)
    }
  }, [])
  return <SelectionContext.Provider value={{ active, resume }}>{children}</SelectionContext.Provider>
}
