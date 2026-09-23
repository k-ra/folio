import { useEffect, useState } from 'react'
import type { Story } from '../model/types'
import type { StoryUpdater } from '../model/store'
import { withBrowserIndex } from '../model/indexClippings'
import { useAccount } from '../cloud/Auth'
import type { JSONContent } from '@tiptap/core'
import IndexEditor, { emptyIndex, indexFromMarkdown } from './IndexEditor'
import { literalMarkdown, selectionMarkdown } from './indexMarkdown'
import './indexStudy.css'

type Passage = { excerpt: string }
type Anchor = Passage & { left: number; top: number }

/** Index uses the story's local durability and revision-checked cloud sync. */
export function useIndexStudy(story: Story, upStory: (fn: StoryUpdater) => void, status: string) {
  const { user } = useAccount()
  const [loaded] = useState((): { document?: JSONContent; error: string } => {
    try {
      return {
        document: withBrowserIndex(story, localStorage, user?.id).index,
        error: '',
      }
    } catch {
      return {
        error: 'Saved clippings could not be read. The stored copy is unchanged.',
      }
    }
  })
  const document = story.index ?? loaded.document ?? emptyIndex()
  const error = story.index ? '' : loaded.error
  useEffect(() => {
    if (loaded.document && story.index === undefined)
      upStory((s) => (s.index === undefined ? { ...s, index: loaded.document } : s))
  }, [loaded.document, story.index])
  const [open, setOpen] = useState(false)
  const [beside, setBeside] = useState(false)
  const [notice, setNotice] = useState('')
  const persist = (next: JSONContent) => {
    if (error) return false
    upStory((s) => ({ ...s, index: next }))
    return true
  }
  const save = (passage: Passage) => {
    const content = document.content || []
    const empty = content.length === 1 && content[0].type === 'paragraph' && !content[0].content?.length
    const saved = persist({
      type: 'doc',
      content: [...(empty ? [] : content), ...(indexFromMarkdown(passage.excerpt).content || [])],
    })
    setNotice(saved ? 'Added to index' : 'Index unavailable · original clippings unchanged')
  }
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 2000)
    return () => clearTimeout(timer)
  }, [notice])
  return {
    document,
    edit: persist,
    open,
    setOpen,
    beside,
    setBeside,
    error,
    status,
    notice,
    save,
  }
}
export type IndexStudy = ReturnType<typeof useIndexStudy>

export function IndexContents({ study }: { study: IndexStudy }) {
  return (
    <>
      <div className="chat-messages index-contents" aria-label="Saved clippings">
        {!study.error && <IndexEditor value={study.document} onChange={study.edit} />}
      </div>
      <small className="index-local">
        {study.error ? 'Index unavailable' : study.status} · Private, not published.
      </small>
      {study.error && (
        <p role="alert" className="magic-error">
          {study.error}
        </p>
      )}
    </>
  )
}

function owner(node: Node | null) {
  return (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>(
    '[data-index-message], [data-story-field], [data-story-text]',
  )
}

function clearSelection() {
  getSelection()?.removeAllRanges()
  const active = document.activeElement
  if (active instanceof HTMLTextAreaElement)
    active.setSelectionRange(active.selectionEnd, active.selectionEnd)
}

export function ClipSelection({ study, reveal }: { study: IndexStudy; reveal: () => void }) {
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  useEffect(() => {
    let frame = 0
    let mouse: { x: number; y: number } | null = null
    const update = () => {
      if (document.activeElement?.closest('.index-selection')) return
      const active = document.activeElement
      let passage: Passage | null = null,
        rect: DOMRect | undefined
      let container: HTMLElement | undefined
      if (
        active instanceof HTMLTextAreaElement &&
        active.getClientRects().length > 0 &&
        active.hasAttribute('data-story-field') &&
        active.selectionStart !== active.selectionEnd
      ) {
        passage = {
          excerpt: literalMarkdown(active.value.slice(active.selectionStart, active.selectionEnd)),
        }
        const bounds = active.getBoundingClientRect()
        rect =
          mouse &&
          mouse.x >= bounds.left &&
          mouse.x <= bounds.right &&
          mouse.y >= bounds.top &&
          mouse.y <= bounds.bottom
            ? new DOMRect(mouse.x, mouse.y, 0, 0)
            : bounds
      } else {
        const selection = getSelection()
        const start = owner(selection?.anchorNode || null),
          end = owner(selection?.focusNode || null)
        if (selection?.rangeCount && !selection.isCollapsed && start && end) {
          const chat = start.dataset.indexMessage !== undefined
          if ((chat && start === end) || (!chat && end.dataset.indexMessage === undefined)) {
            const range = selection.getRangeAt(0)
            const excerpt =
              chat || start === end
                ? selectionMarkdown(
                    chat ? start.querySelector<HTMLElement>('.folio-markdown') || start : start,
                    range,
                  )
                : [...document.querySelectorAll<HTMLElement>('[data-story-text]')]
                    .filter((el) => range.intersectsNode(el))
                    .map((el) => {
                      const part = document.createRange()
                      part.selectNodeContents(el)
                      if (range.compareBoundaryPoints(Range.START_TO_START, part) > 0)
                        part.setStart(range.startContainer, range.startOffset)
                      if (range.compareBoundaryPoints(Range.END_TO_END, part) < 0)
                        part.setEnd(range.endContainer, range.endOffset)
                      return selectionMarkdown(el, part)
                    })
                    .join('\n\n')
            passage = {
              excerpt,
            }
            container = start.closest<HTMLElement>('.chat-messages') || undefined
            const boundary = container?.getBoundingClientRect()
            const visible = [...range.getClientRects()].filter(
              (r) => r.width && r.bottom > (boundary?.top || 0) && r.top < (boundary?.bottom || innerHeight),
            )
            rect = visible[visible.length - 1]
          }
        }
      }
      if (!passage?.excerpt.trim() || !rect || rect.bottom < 0 || rect.top > innerHeight) {
        setAnchor(null)
        return
      }
      setAnchor({
        ...passage,
        excerpt: passage.excerpt.trim(),
        left: Math.max(8, Math.min(innerWidth - 142, rect.right - 134)),
        top: Math.max(
          8,
          Math.min(
            innerHeight - 42,
            (container?.getBoundingClientRect().bottom || innerHeight) - 38,
            rect.bottom + 6,
          ),
        ),
      })
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    const up = (e: PointerEvent) => {
      mouse = { x: e.clientX, y: e.clientY }
      schedule()
    }
    const key = (e: KeyboardEvent) => {
      const button = document.querySelector<HTMLButtonElement>('.index-selection')
      if (e.key === 'Escape') {
        clearSelection()
        setAnchor(null)
        return
      }
      if (e.key === 'Tab' && !e.shiftKey && button && activeElement() !== button) {
        e.preventDefault()
        button.focus()
      } else {
        mouse = null
        schedule()
      }
    }
    const activeElement = () => document.activeElement
    document.addEventListener('selectionchange', schedule)
    document.addEventListener('pointerup', up)
    document.addEventListener('keyup', schedule)
    document.addEventListener('keydown', key)
    document.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('selectionchange', schedule)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('keyup', schedule)
      document.removeEventListener('keydown', key)
      document.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
    }
  }, [])
  return (
    <>
      {anchor && (
        <button
          className="index-selection"
          onPointerDown={(e) => e.preventDefault()}
          style={{ left: anchor.left, top: anchor.top }}
          onClick={() => {
            study.save(anchor)
            clearSelection()
            setAnchor(null)
          }}
        >
          Save to index
        </button>
      )}
      {study.notice && (
        <button className="index-saved" role="status" onClick={reveal}>
          {study.notice} · Open
        </button>
      )}
      {study.error && !study.open && (
        <p className="save-notice" role="alert">
          {study.error}
        </p>
      )}
    </>
  )
}
