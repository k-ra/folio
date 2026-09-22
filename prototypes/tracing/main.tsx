import React, { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { KEY, keep, load, sample, type Notebook, type Message } from './model'
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
  const clip = (message: Message) => {
    const selection = getSelection(),
      node = messageNodes.current.get(message.id)
    const selected =
      selection && node?.contains(selection.anchorNode) && node.contains(selection.focusNode)
        ? selection.toString().trim()
        : ''
    const excerpt = selected || message.text
    const next = keep(book, message.id, excerpt)
    const entry = next.clips.find((c) => c.messageId === message.id && c.excerpt === excerpt)!
    save(next)
    setHighlight(entry.id)
    setNotice('Kept in INDEX.')
  }
  const openSource = (messageId: string) => {
    setIndex(false)
    setResearch(true)
    setHighlight(messageId)
    requestAnimationFrame(() => messageNodes.current.get(messageId)?.scrollIntoView({ block: 'center' }))
  }
  return (
    <>
      <div className="study-label">
        FOLIO / INDEX STUDY <span>local prototype · sample conversation · no live AI</span>
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
        {research && (
          <aside className="research panel" aria-label="Research chat">
            <header>
              <h2>CHAT</h2>
              <button aria-label="Close research chat" onClick={() => setResearch(false)}>
                ×
              </button>
            </header>
            <div className="messages">
              {book.messages.map((m) => (
                <section
                  key={m.id}
                  className={`message ${highlight === m.id ? 'highlight' : ''}`}
                  aria-label={`${m.who} message`}
                >
                  <small>{m.who}</small>
                  <p
                    ref={(el) => {
                      if (el) messageNodes.current.set(m.id, el)
                      else messageNodes.current.delete(m.id)
                    }}
                  >
                    {m.text}
                  </p>
                  <button className="keep" onMouseDown={(e) => e.preventDefault()} onClick={() => clip(m)}>
                    Keep
                  </button>
                  {book.clips.some((c) => c.messageId === m.id) && (
                    <button
                      className="source"
                      onClick={() => {
                        setIndex(true)
                        setHighlight(book.clips.find((c) => c.messageId === m.id)!.id)
                      }}
                    >
                      In index
                    </button>
                  )}
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
        <main className="sheet">
          <article aria-label="Sample essay">
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
              onClick={() => setResearch(!research)}
            >
              ◉
            </button>
            <button aria-label="Open index" onClick={() => setIndex(!index)}>
              INDEX{book.clips.length ? <sup>{book.clips.length}</sup> : null}
            </button>
          </nav>
          {index && (
            <section className="tracing" aria-label="Tracing index">
              <header>
                <h2>INDEX</h2>
                <button aria-label="Close index" onClick={() => setIndex(false)}>
                  ×
                </button>
              </header>
              <div className="index-scroll">
                {!book.clips.length && (
                  <p className="empty">
                    Keep a thought from chat. It can stay here until you know where it belongs.
                  </p>
                )}
                {book.clips.map((c, i) => (
                  <section key={c.id} className={`clipping ${highlight === c.id ? 'highlight' : ''}`}>
                    <small>{String(i + 1).padStart(2, '0')} / RESEARCH</small>
                    <button
                      className="excerpt"
                      aria-expanded={expanded === c.id}
                      onClick={() => setExpanded(expanded === c.id ? '' : c.id)}
                    >
                      {c.excerpt}
                    </button>
                    {expanded === c.id && (
                      <div className="context" role="region" aria-label="Saved conversation">
                        <small>CONVERSATION WHEN KEPT</small>
                        {c.conversation.map((m) => (
                          <div key={m.id}>
                            <small>{m.who}</small>
                            <p>{m.text}</p>
                          </div>
                        ))}
                        <button onClick={() => openSource(c.messageId)}>Open research chat</button>
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
      <div className="notice" role={error ? 'alert' : 'status'}>
        {error || notice}
      </div>
    </>
  )
}
createRoot(document.getElementById('prototype')!).render(<Study />)
