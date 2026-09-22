import { useEffect, useState } from 'react'

export type SelectedClip = { id: string; source: 'chat' | 'essay'; excerpt: string }
type Anchor = SelectedClip & { left: number; top: number }
/** One action attached to an actual text selection, never repeated below messages. */
export default function SelectionClip({ save }: { save: (clip: SelectedClip) => void }) {
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  useEffect(() => {
    let frame = 0
    const update = () => {
      if (document.activeElement?.closest('.selection-clip')) return
      const selection = getSelection()
      if (!selection?.rangeCount || selection.isCollapsed) {
        setAnchor(null)
        return
      }
      const parent = (node: Node | null) =>
        (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>('[data-clip-source]')
      const start = parent(selection.anchorNode),
        end = parent(selection.focusNode)
      if (!start || start !== end) {
        setAnchor(null)
        return
      }
      const excerpt = selection.toString().trim()
      if (!excerpt) {
        setAnchor(null)
        return
      }
      const rects = [...selection.getRangeAt(0).getClientRects()]
      const scroller = start.closest('.messages')?.getBoundingClientRect()
      const topEdge = Math.max(0, scroller?.top || 0),
        bottomEdge = Math.min(innerHeight, scroller?.bottom || innerHeight)
      const visible = rects.filter((r) => r.bottom > topEdge && r.top < bottomEdge && r.width > 0)
      const rect = visible[visible.length - 1]
      if (!rect) {
        setAnchor(null)
        return
      }
      setAnchor({
        id: start.dataset.clipId!,
        source: start.dataset.clipSource as SelectedClip['source'],
        excerpt,
        left: Math.max(12, Math.min(innerWidth - 136, rect.right - 124)),
        top: Math.max(12, Math.min(bottomEdge - 36, rect.bottom + 8)),
      })
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    const escape = (e: KeyboardEvent) => {
      const action = document.querySelector<HTMLButtonElement>('.selection-clip')
      if (e.key === 'Tab' && !e.shiftKey && action && document.activeElement !== action) {
        e.preventDefault()
        action.focus()
      }
      if (e.key === 'Escape') {
        getSelection()?.removeAllRanges()
        setAnchor(null)
      }
    }
    document.addEventListener('selectionchange', schedule)
    document.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    document.addEventListener('keydown', escape)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('selectionchange', schedule)
      document.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('keydown', escape)
    }
  }, [])
  return (
    anchor && (
      <button
        className="selection-clip"
        style={{ left: anchor.left, top: anchor.top }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          save(anchor)
          getSelection()?.removeAllRanges()
          setAnchor(null)
        }}
      >
        Save to index
      </button>
    )
  )
}
