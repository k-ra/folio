import React, { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { KEY, keep, load, sample, type Notebook } from './model'
import Markdown from '../../src/text/Markdown'
import SelectionClip, { type SelectedClip } from './SelectionClip'
import './prototype.css'

function Study() {
  const [readError] = useState(() => {
    try {
      load()
      return ''
    } catch (e) {
      return String(e)
    }
  })
  const [book, setBook] = useState<Notebook>(() => {
    try {
      return load()
    } catch {
      return sample
    }
  })
  const [error, setError] = useState(readError)
  const [research, setResearch] = useState(true),
    [index, setIndex] = useState(false)
  const [artifact, setArtifact] = useState(false),
    [expanded, setExpanded] = useState('')
  const [highlight, setHighlight] = useState(''),
    [draft, setDraft] = useState('')
  const [instruction, setInstruction] = useState(''),
    [objectNotes, setObjectNotes] = useState<string[]>([])
  const messageNodes = useRef(new Map<string, HTMLElement>())
  const chatScroll = useRef(0)
  const [notice, setNotice] = useState('')
  const save = (next: Notebook) => {
    setBook(next)
    try {
      if (readError) throw new Error(readError)
      localStorage.setItem(KEY, JSON.stringify(next))
      setError('')
    } catch {
      setError('Kept in this tab only. Browser saving is unavailable; do not close this prototype yet.')
    }
  }
  const clip = ({ id, excerpt, source }: SelectedClip) => {
    const essay = [...document.querySelectorAll('article h1, article p')]
      .map((el) => el.textContent)
      .join('\n\n')
    const next = keep(book, id, excerpt, source, essay)
    const entry = next.clips.find((c) => c.messageId === id && c.excerpt === excerpt)!
    save(next)
    setHighlight(entry.id)
    setNotice('Saved to INDEX.')
  }
  const openSource = (messageId: string, source = 'chat', excerpt = '') => {
    setIndex(false)
    setResearch(source === 'chat')
    setHighlight(messageId)
    requestAnimationFrame(() => {
      const root =
        source === 'essay' ? document.querySelector('article') : messageNodes.current.get(messageId)
      if (!root) return
      // Find the actual passage inside long answers, not the middle of the entire answer.
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      let node: Node | null
      while ((node = walker.nextNode())) nodes.push(node as Text)
      const offset = nodes
        .map((n) => n.data)
        .join('')
        .indexOf(excerpt)
      let consumed = 0
      for (const n of nodes) {
        if (offset >= consumed && offset < consumed + n.length) {
          n.parentElement?.scrollIntoView({ block: 'center' })
          return
        }
        consumed += n.length
      }
      root.scrollIntoView({ block: 'start' })
    })
  }
  return (
    <>
      <div className="study-label">
        FOLIO / INDEX STUDY <span>local prototype · captured live response · no new AI requests</span>
      </div>
      <div
        className="studio"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIndex(false)
            setArtifact(false)
          }
        }}
      >
        {research && !index && (
          <aside className="research panel" aria-label="Research chat">
            <header>
              <nav className="drawer-tabs" aria-label="Left drawer">
                <button aria-pressed="true">CHAT</button>
                <button onClick={() => setIndex(true)}>INDEX</button>
              </nav>
              <button aria-label="Close research chat" onClick={() => setResearch(false)}>
                ×
              </button>
            </header>
            <div
              className="messages"
              ref={(el) => {
                if (el) el.scrollTop = chatScroll.current
              }}
              onScroll={(e) => {
                chatScroll.current = e.currentTarget.scrollTop
              }}
            >
              {book.messages.map((m) => (
                <section
                  key={m.id}
                  className={`message ${highlight === m.id ? 'highlight' : ''}`}
                  aria-label={`${m.who} message`}
                >
                  <small>{m.who}</small>
                  <div
                    data-clip-source="chat"
                    data-clip-id={m.id}
                    tabIndex={0}
                    ref={(el) => {
                      if (el) messageNodes.current.set(m.id, el)
                      else messageNodes.current.delete(m.id)
                    }}
                  >
                    <Markdown>{m.text}</Markdown>
                  </div>
                </section>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!draft.trim()) return
                save({
                  ...book,
                  messages: [...book.messages, { id: crypto.randomUUID(), who: 'You', text: draft.trim() }],
                })
                setDraft('')
                setNotice('Research note saved.')
              }}
            >
              <small>NO AI · your research notebook</small>
              <textarea
                aria-label="Research note"
                placeholder="Leave yourself a thought…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button>Add note</button>
            </form>
          </aside>
        )}
        {index && (
          <section className="tracing panel" aria-label="Index">
            <header>
              <nav className="drawer-tabs" aria-label="Left drawer">
                <button
                  onClick={() => {
                    setIndex(false)
                    setResearch(true)
                  }}
                >
                  CHAT
                </button>
                <button aria-pressed="true">INDEX</button>
              </nav>
              <button
                aria-label="Close index"
                onClick={() => {
                  setIndex(false)
                  setResearch(false)
                }}
              >
                ×
              </button>
            </header>
            <div className="index-scroll">
              {!book.clips.length && (
                <p className="empty">Select a passage in chat or the essay to save it here.</p>
              )}
              {book.clips.map((c, i) => (
                <section key={c.id} className={`clipping ${highlight === c.id ? 'highlight' : ''}`}>
                  <small>
                    {String(i + 1).padStart(2, '0')} / {c.source === 'essay' ? 'ESSAY' : 'CHAT'}
                  </small>
                  <button
                    className="excerpt"
                    aria-expanded={expanded === c.id}
                    onClick={() => setExpanded(expanded === c.id ? '' : c.id)}
                  >
                    {c.excerpt}
                  </button>
                  {expanded === c.id && (
                    <div className="context" role="region" aria-label="Saved conversation">
                      <small>{c.source === 'essay' ? 'ESSAY WHEN SAVED' : 'CONVERSATION WHEN SAVED'}</small>
                      {c.conversation.map((m) => (
                        <div key={m.id}>
                          <small>{m.who}</small>
                          <Markdown>{m.text}</Markdown>
                        </div>
                      ))}
                      <button onClick={() => openSource(c.messageId, c.source, c.excerpt)}>
                        {c.source === 'essay' ? 'Back to essay' : 'Open research chat'}
                      </button>
                      <button
                        className="source"
                        onClick={() => save({ ...book, clips: book.clips.filter((x) => x.id !== c.id) })}
                      >
                        Remove clipping
                      </button>
                    </div>
                  )}
                </section>
              ))}
            </div>
            <footer>Research stays beside the essay, not inside it.</footer>
          </section>
        )}
        <main className="sheet">
          <article aria-label="Sample essay" data-clip-source="essay" data-clip-id="essay">
            <h1>The space between observations</h1>
            <p>
              For one week I returned to the same window. Nothing there was extraordinary: a branch, a pale
              wall, the square of light that arrived in the afternoon.
            </p>
            <p>
              I wrote down what changed. The shadows grew longer. The branch carried one fewer leaf. Some days
              the light never arrived at all.
            </p>
            <p>
              The record and the reading of it are different things. I wanted a place to hold both, without
              mistaking one for the other.
            </p>
            <div className={`graphic ${artifact ? 'selected' : ''}`}>
              <button
                className="visual"
                aria-label="Open graphic editing"
                onClick={() => {
                  setArtifact(true)
                  setIndex(false)
                }}
              >
                <svg
                  viewBox="0 0 560 170"
                  role="img"
                  aria-label="Illustrative observations, not research data"
                >
                  <path
                    d="M24 135 C50 126 84 102 112 98 S174 114 200 106 S260 55 288 62 S350 84 376 80 S442 24 464 34 S510 52 536 46"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  {[
                    [24, 135],
                    [112, 98],
                    [200, 106],
                    [288, 62],
                    [376, 80],
                    [464, 34],
                    [536, 46],
                  ].map(([x, y]) => (
                    <circle key={x} cx={x} cy={y} r="3" fill="currentColor" />
                  ))}
                </svg>
                <small>Seven imagined observations.</small>
              </button>
              {artifact && (
                <button
                  className="artifact-orb"
                  aria-label="Graphic conversation"
                  onClick={() => setArtifact(true)}
                >
                  ●
                </button>
              )}
            </div>
            <p>
              Perhaps an essay begins in the interval: the distance between looking and knowing what to say.
            </p>
          </article>
          <nav className="left-rail" aria-label="Research tools">
            <button
              aria-label="Open research chat"
              title="Research chat"
              onClick={() => {
                setResearch(!research || index)
                setIndex(false)
              }}
            >
              ◉
            </button>
            <button
              aria-label="Open index"
              onClick={() => {
                setIndex(!index)
                setResearch(true)
              }}
            >
              INDEX{book.clips.length ? <sup>{book.clips.length}</sup> : null}
            </button>
          </nav>
        </main>
        {artifact && (
          <aside className="object panel" aria-label="Graphic conversation">
            <header>
              <h2>GRAPHIC</h2>
              <button aria-label="Close graphic conversation" onClick={() => setArtifact(false)}>
                ×
              </button>
            </header>
            <small>Seven imagined observations.</small>
            <div className="messages">
              <p className="empty">This conversation belongs only to this graphic.</p>
              {objectNotes.map((text, i) => (
                <p className="message" key={i}>
                  {text}
                </p>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!instruction.trim()) return
                setObjectNotes([...objectNotes, instruction])
                setInstruction('')
                setNotice(
                  'Object instruction noted for this session. This prototype does not generate graphics.',
                )
              }}
            >
              <textarea
                aria-label="Graphic instruction"
                placeholder="What should change?"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
              <button>Note instruction</button>
            </form>
          </aside>
        )}
      </div>
      <SelectionClip save={clip} />
      <div className="notice" role={error ? 'alert' : 'status'}>
        {error || notice}
      </div>
    </>
  )
}
createRoot(document.getElementById('prototype')!).render(<Study />)
