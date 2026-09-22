import { useEffect, useState } from 'react'
import type { Story } from '../model/types'
import { useAccount } from '../cloud/Auth'
import Markdown from '../text/Markdown'
import { storyText } from '../portable/backup'
import './indexStudy.css'

type Passage = { source: 'chat' | 'essay'; key: string; excerpt: string }
type Clip = Passage & { id: string; context: string }
type Anchor = Passage & { left: number; top: number }

/** Branch-only experiment: clipping storage is separate from published story schemas. */
export function useIndexStudy(story: Story) {
  const { user } = useAccount()
  const storage = `folio.index-study.v2:${user?.id || 'browser'}:${story.id}`
  const [loaded] = useState((): { clips: Clip[]; error: string } => {
    try {
      const value = JSON.parse(localStorage.getItem(storage) || '[]')
      if (
        !Array.isArray(value) ||
        value.some(
          (c) =>
            !c ||
            typeof c.id !== 'string' ||
            typeof c.context !== 'string' ||
            typeof c.excerpt !== 'string' ||
            typeof c.key !== 'string' ||
            !['chat', 'essay'].includes(c.source),
        )
      )
        throw new Error('Unreadable clippings')
      return { clips: value, error: '' }
    } catch {
      return { clips: [], error: 'Saved clippings could not be read. The stored copy is unchanged.' }
    }
  })
  const [clips, setClips] = useState(loaded.clips)
  const [error, setError] = useState(loaded.error)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState('')
  const [notice, setNotice] = useState('')
  const persist = (next: Clip[]) => {
    setClips(next)
    try {
      if (loaded.error) throw new Error(loaded.error)
      localStorage.setItem(storage, JSON.stringify(next))
      setError('')
    } catch {
      setError('Clippings are only in this tab. Browser saving failed.')
    }
  }
  const save = (passage: Passage) => {
    if (
      !clips.some(
        (c) => c.source === passage.source && c.key === passage.key && c.excerpt === passage.excerpt,
      )
    ) {
      const context =
        passage.source === 'essay'
          ? storyText(story)
          : (story.chats.chat || []).map((m) => `${m.me ? 'YOU' : 'FOLIO'}\n\n${m.text}`).join('\n\n')
      persist([...clips, { ...passage, id: crypto.randomUUID(), context }])
    }
    setNotice('Saved to index')
  }
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 2000)
    return () => clearTimeout(timer)
  }, [notice])
  return {
    clips,
    open,
    setOpen,
    expanded,
    setExpanded,
    error,
    notice,
    save,
    remove: (id: string) => persist(clips.filter((c) => c.id !== id)),
  }
}
export type IndexStudy = ReturnType<typeof useIndexStudy>

export function IndexContents({ study }: { study: IndexStudy }) {
  return (
    <>
      <div className="chat-messages index-contents" aria-label="Saved clippings">
        {!study.clips.length && (
          <p className="index-empty">Select words in chat or your essay to save a clipping.</p>
        )}
        {study.clips.map((c) => (
          <section className="index-clipping" key={c.id}>
            <span className="eyebrow">{c.source === 'chat' ? 'CHAT' : 'ESSAY'}</span>
            <button
              className="index-excerpt"
              aria-expanded={study.expanded === c.id}
              onClick={() => study.setExpanded(study.expanded === c.id ? '' : c.id)}
            >
              {c.excerpt}
            </button>
            {study.expanded === c.id && (
              <div className="index-context">
                <button
                  onClick={() => {
                    study.setOpen(false)
                    requestAnimationFrame(() => {
                      const selector = c.source === 'chat' ? '[data-index-message]' : '[data-story-field]'
                      const source = [...document.querySelectorAll<HTMLElement>(selector)].find(
                        (el) => (c.source === 'chat' ? el.dataset.indexMessage : el.dataset.id) === c.key,
                      )
                      const passage =
                        source &&
                        [...source.querySelectorAll<HTMLElement>('p, li')].find((el) =>
                          el.textContent?.includes(c.excerpt.slice(0, 40)),
                        )
                      ;(passage || source)?.scrollIntoView({ block: 'center' })
                    })
                  }}
                >
                  Open source
                </button>
                <span className="eyebrow">CONTEXT WHEN SAVED</span>
                {c.source === 'chat' ? <Markdown>{c.context}</Markdown> : <p>{c.context}</p>}
                <button onClick={() => study.remove(c.id)}>Remove clipping</button>
              </div>
            )}
          </section>
        ))}
      </div>
      <small className="index-local">
        Prototype · clippings stay in this browser, outside exports and cloud saves.
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
          source: 'essay',
          key: active.dataset.id!,
          excerpt: active.value.slice(active.selectionStart, active.selectionEnd),
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
                ? selection.toString()
                : [...document.querySelectorAll<HTMLElement>('[data-story-text]')]
                    .filter((el) => range.intersectsNode(el))
                    .map((el) => {
                      const part = document.createRange()
                      part.selectNodeContents(el)
                      if (range.compareBoundaryPoints(Range.START_TO_START, part) > 0)
                        part.setStart(range.startContainer, range.startOffset)
                      if (range.compareBoundaryPoints(Range.END_TO_END, part) < 0)
                        part.setEnd(range.endContainer, range.endOffset)
                      return part.toString()
                    })
                    .join('\n\n')
            passage = {
              source: chat ? 'chat' : 'essay',
              key: chat ? start.dataset.indexMessage! : start.dataset.id!,
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
