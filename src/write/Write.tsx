import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import type { AI } from '../ai'
import { connectedChat } from '../ai/connected'
import AIConnection from '../ai/AIConnection'
import { DEFAULT_FILES, DEF_STYLE, EASE, FONTS, MONO, SANS } from '../model/constants'
import type { StoryUpdater } from '../model/store'
import type { Block, BlockType, ChatFocus, Panel as PanelT, Story, Style } from '../model/types'
import { hexToRgb, textBlock as T, wordCount } from '../model/util'
import AutoTextarea from '../ui/AutoTextarea'
import Backdrop from './Backdrop'
import Blocks from './Blocks'
import StorySources from './StorySources'
import type { WriteCtl } from './ctl'
import { focusLabel } from './focus'
import { chatTarget, isChatPanel } from './chatTarget'
import History from './History'
import Panel from './Panel'
import { useMagic } from '../magic/useMagic'
import { newMagicBlock } from '../magic/state'
import { migrateStory } from '../model/migrate'
import { newId } from '../model/util'
import { useFancy } from '../fancy/useFancy'
import { mergeParagraph } from '../model/paragraphs'

interface Props {
  story: Story
  isNew: boolean
  ai: AI
  upStory: (fn: StoryUpdater, why?: string) => void
  upBlock: (bid: string, fn: (b: Block) => Block, why?: string) => void
  goHome: () => void
  saveError: string
  saving?: boolean
  cloudStatus?: string
}

const mono: CSSProperties = {
  font: `400 10px ${MONO}`,
  letterSpacing: '1.5px',
}

export default function Write({
  story,
  isNew,
  ai,
  upStory,
  upBlock,
  goHome,
  saveError,
  saving,
  cloudStatus,
}: Props) {
  const [panel, setPanel] = useState<PanelT | null>(null)
  const [draft, setDraftState] = useState<Style | null>(null)
  // Keep unsent drafts with their conversations when selection changes the target.
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({})
  const chatKey = panel?.kind === 'block' ? panel.id : panel?.kind || 'chat'
  const chatInput = chatDrafts[chatKey] || ''
  const setChatInput = (text: string) => setChatDrafts((d) => ({ ...d, [chatKey]: text }))
  const [sel, setSel] = useState<string | null>(null)
  const [blockHover, setBlockHover] = useState<string | null>(null)
  const [picker, setPicker] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(isNew ? 'title' : null)
  const [chatFocus, setChatFocus] = useState<ChatFocus | null>(null)
  const [orbsHov, setOrbsHov] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [chatError, setChatError] = useState('')
  const chatRequest = useRef<AbortController | null>(null)
  useEffect(() => () => chatRequest.current?.abort(), [])
  const drag = useRef<{ id: string; y: number; h: number } | null>(null)
  const storyRef = useRef(story)
  const caret = useRef<number | null>(null)
  const mergeUndo = useRef<{ before: Story; after: Story; id: string }[]>([])
  storyRef.current = story

  const S: Style = { ...DEF_STYLE, ...story.style }
  const V: Style = panel?.kind === 'style' && draft ? draft : S
  const magic = useMagic(story, V, upStory, (id) => openArtifactChat(id))
  const fancy = useFancy(story, V, upStory, (id) => openArtifactChat(id))
  const files = story.files || DEFAULT_FILES
  const card = V.paper === 'card'
  const bdOn = V.backdrop !== 'none'
  const [r, g, b] = hexToRgb(V.bg)
  const lineH = Math.round(V.size * 1.75)
  const panelOpen = !!panel

  useEffect(() => {
    document.body.style.background = V.bg
  }, [V.bg])

  // Focus requests: after the render that creates a textarea, put the caret at its end.
  useLayoutEffect(() => {
    if (!focusId) return
    const el = document.querySelector<HTMLTextAreaElement>(`textarea[data-id="${focusId}"]`)
    if (el) {
      el.focus()
      const pos = caret.current ?? el.value.length
      el.setSelectionRange(pos, pos)
      caret.current = null
    }
    setFocusId(null)
  }, [focusId, story.blocks])

  // Padding drag
  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      const d = drag.current
      if (!d) return
      const h = Math.max(8, Math.round((d.h + e.clientY - d.y) / 4) * 4)
      upBlock(d.id, (x) => (x.type === 'padding' ? { ...x, h } : x))
    }
    const onUp = () => {
      drag.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [upBlock])

  // ---- panels
  const togglePanel = (kind: 'data' | 'style' | 'chat') => {
    const same = kind === 'chat' ? isChatPanel(panel) : panel?.kind === kind
    if (kind === 'style' && !same) setDraftState({ ...DEF_STYLE, ...storyRef.current.style })
    setPanel(same ? null : kind === 'chat' ? chatTarget(storyRef.current, chatFocus?.id) : { kind })
  }
  const setDraft = (patch: Partial<Style>) => setDraftState((d) => ({ ...(d || S), ...patch }))
  const pickBackdropImage = (f: File) => {
    const rd = new FileReader()
    rd.onload = () =>
      setDraftState((d) => ({
        ...(d || S),
        backdrop: 'image',
        backdropSrc: String(rd.result),
        paper: 'card',
      }))
    rd.readAsDataURL(f)
  }
  const applyStyle = () => {
    if (!draft) return
    const d = draft
    upStory((s) => ({ ...s, style: { ...d } }), 'Restyled')
  }
  const resetStyle = () => setDraftState({ ...S })
  const savePreset = (name: string) =>
    upStory(
      (s) => ({
        ...s,
        presets: [...(s.presets || []), { id: newId(), name, style: { ...(draft || S) } }],
      }),
      'Preset saved',
    )

  const pushMsg = (key: string, me: boolean, text: string, focus?: string | null) =>
    upStory((s) => ({
      ...s,
      chats: {
        ...s.chats,
        [key]: [...(s.chats[key] || []), { me, text, focus: focus || null }],
      },
    }))

  const sendChat = async () => {
    const text = chatInput.trim()
    if (!text || !panel || busy) return
    if (panel.kind === 'block') {
      const block = storyRef.current.blocks.find((b) => b.id === panel.id)
      if (block?.type === 'magic') {
        if (block.status === 'rendering') return
        setChatInput('')
        await magic.generate(block.id, text)
        return
      }
      if (block?.type === 'fancy') {
        if (block.status === 'rendering') return
        setChatInput('')
        await fancy.generate(block.id, text)
        return
      }
    }
    const key = panel.kind === 'block' ? panel.id : panel.kind
    const fl = panel.kind === 'chat' && chatFocus ? focusLabel(story, chatFocus) : null
    const focusStr = fl ? fl.kind + (fl.quote ? ' · “' + fl.quote + '”' : '') : null
    pushMsg(key, true, text, focusStr)
    setChatInput('')
    setBusy(true)
    setChatError('')
    const controller = new AbortController()
    chatRequest.current = controller
    try {
      let reply = ''
      if (panel.kind === 'style') {
        const res = await ai.restyle(text, draft || S)
        setDraftState((d) => ({ ...(d || S), ...res.patch }))
        reply = res.explanation
      } else if (magic.connected) {
        reply = await connectedChat(story.chats[key] || [], text, fl, story, controller.signal)
      } else if (panel.kind === 'data') {
        reply = await ai.dataReply(text, files)
      } else {
        reply = await ai.chat(story.chats.chat || [], text, fl, story)
      }
      pushMsg(key, false, reply)
    } catch (error) {
      if (!controller.signal.aborted) {
        setChatError(error instanceof Error ? error.message : 'Chat could not finish. Please retry.')
        setChatDrafts((d) => ({ ...d, [key]: d[key] || text }))
      }
    } finally {
      setBusy(false)
    }
  }

  // ---- blocks
  const setTitle = (v: string) => upStory((s) => ({ ...s, title: v }))
  const setBlockText = (bid: string, v: string) => {
    const block = storyRef.current.blocks.find((b) => b.id === bid)
    if (block?.type === 'fancy' && block.status === 'rendering') fancy.cancel(bid)
    upBlock(bid, (x) => ('text' in x ? { ...x, text: v } : x))
    if (picker === bid && v) setPicker(null)
  }
  const setBlockPrompt = (bid: string, v: string) =>
    upBlock(bid, (x) => ('prompt' in x ? { ...x, prompt: v } : x))
  const focusBlock = (bid: string) => {
    setSel(bid)
    setChatFocus({ id: bid })
    setPanel((p) => (isChatPanel(p) ? chatTarget(storyRef.current, bid) : p))
  }
  const selectBlock = (bid: string) => {
    if (sel !== bid) {
      setPicker(null)
      focusBlock(bid)
    } else {
      // A selected prompt may just have become a finished artifact.
      setPanel((p) => (isChatPanel(p) ? chatTarget(storyRef.current, bid) : p))
    }
  }
  const selText = (bid: string, quote: string) => {
    setChatFocus((f) => (quote ? { id: bid, quote } : f && f.id === bid && f.quote ? null : f))
  }
  const togglePicker = (bid: string) => {
    setPicker((p) => (p === bid ? null : bid))
    setSel(bid)
  }
  const pickType = (bid: string, t: Exclude<BlockType, 'text' | 'graphic'>) => {
    upStory((s) => {
      const blocks = s.blocks.map((x): Block => {
        if (x.id !== bid) return x
        if (t === 'magic') return newMagicBlock(x.id)
        if (t === 'fancy')
          return {
            id: x.id,
            type: 'fancy',
            text: '',
            prompt: '',
            fancy: {
              size: 30,
              align: 'center',
              font: 'header',
              italic: false,
              pad: 30,
              ls: 0,
            },
          }
        if (t === 'media') return { id: x.id, type: 'media', src: null, text: '' }
        return { id: x.id, type: 'padding', h: 120 }
      })
      const i = blocks.findIndex((x) => x.id === bid)
      if (i === blocks.length - 1) blocks.push(T(''))
      return { ...s, blocks }
    })
    setPicker(null)
    setSel(bid)
    setFocusId(bid)
  }
  const blockKey = (e: KeyboardEvent<HTMLTextAreaElement>, bid: string) => {
    const s = storyRef.current
    const i = s.blocks.findIndex((x) => x.id === bid)
    const blk = s.blocks[i]
    if (!blk) return
    const el = e.currentTarget
    if (e.nativeEvent.isComposing) return
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && mergeUndo.current.length) {
      const undo = mergeUndo.current[mergeUndo.current.length - 1]
      if (
        JSON.stringify(s.blocks) === JSON.stringify(undo.after.blocks) &&
        JSON.stringify(s.notes) === JSON.stringify(undo.after.notes) &&
        JSON.stringify(s.chats) === JSON.stringify(undo.after.chats)
      ) {
        e.preventDefault()
        upStory(
          (st) => ({
            ...st,
            blocks: undo.before.blocks,
            notes: undo.before.notes,
            chats: undo.before.chats,
          }),
          'Merge undone',
        )
        caret.current = 0
        setFocusId(undo.id)
        setSel(undo.id)
        mergeUndo.current.pop()
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const pos = el.selectionStart
      const before = el.value.slice(0, pos)
      const after = el.value.slice(pos)
      const nb = T(after)
      upStory((st) => {
        const blocks = [...st.blocks]
        blocks[i] = 'text' in blk ? { ...blk, text: before } : blk
        blocks.splice(i + 1, 0, nb)
        return { ...st, blocks }
      })
      setFocusId(nb.id)
      setSel(nb.id)
      setPicker(null)
    } else if (
      e.key === 'Backspace' &&
      el.selectionStart === 0 &&
      el.selectionEnd === 0 &&
      blk.type === 'text'
    ) {
      const merged = mergeParagraph(s, bid)
      if (!merged) return
      e.preventDefault()
      mergeUndo.current.push({ before: s, after: merged.story, id: bid })
      upStory(() => merged.story, 'Paragraphs merged')
      caret.current = merged.caret
      setFocusId(merged.target)
      setSel(merged.target)
      setPicker(null)
    } else if (e.key === 'ArrowUp' && el.selectionStart === 0 && i > 0) {
      const p = s.blocks[i - 1]
      if (p.type === 'text' || p.type === 'fancy') {
        e.preventDefault()
        setFocusId(p.id)
        setSel(p.id)
      }
    } else if (e.key === 'ArrowDown' && el.selectionStart === el.value.length && i < s.blocks.length - 1) {
      const n = s.blocks[i + 1]
      if (n.type === 'text' || n.type === 'fancy') {
        e.preventDefault()
        setFocusId(n.id)
        setSel(n.id)
      }
    }
  }
  const openArtifactChat = (bid: string) => {
    setSel(bid)
    setChatFocus({ id: bid })
    setPanel({ kind: 'block', id: bid })
    setFocusId('chat')
  }
  const clearFocus = () => {
    setSel(null)
    setChatFocus(null)
    setPanel((p) => (isChatPanel(p) ? { kind: 'chat' } : p))
  }
  const pickMedia = (bid: string, f: File) => {
    const rd = new FileReader()
    rd.onload = () => upBlock(bid, (x) => (x.type === 'media' ? { ...x, src: String(rd.result) } : x))
    rd.readAsDataURL(f)
  }
  const deleteBlock = (bid: string) => {
    magic.cancel(bid)
    fancy.cancel(bid)
    upStory((s) => {
      const blocks = s.blocks.filter((x) => x.id !== bid)
      return { ...s, blocks: blocks.length ? blocks : [T('')] }
    })
    setSel(null)
    setChatFocus((f) => (f?.id === bid ? null : f))
    setPanel((p) => (p && p.kind === 'block' && p.id === bid ? null : p))
  }
  const padDown = (e: MouseEvent, bid: string, blk: Extract<Block, { type: 'padding' }>) => {
    e.preventDefault()
    e.stopPropagation()
    drag.current = { id: bid, y: e.clientY, h: blk.h }
    setSel(bid)
  }
  const addNote = (bid: string) => {
    upStory((s) => ({ ...s, notes: { ...s.notes, [bid]: '' } }))
    setFocusId('n-' + bid)
  }
  const setNote = (bid: string, v: string) => upStory((s) => ({ ...s, notes: { ...s.notes, [bid]: v } }))
  const noteBlur = (bid: string) => {
    if ((storyRef.current.notes[bid] || '').trim()) return
    upStory((s) => {
      const n = { ...s.notes }
      delete n[bid]
      return { ...s, notes: n }
    })
  }
  const restoreVersion = (t: number) => {
    magic.cancelAll()
    fancy.cancelAll()
    upStory((s) => {
      const v = (s.history || []).find((x) => x.t === t)
      if (!v) return s
      return migrateStory({ ...s, ...JSON.parse(v.snap) })
    }, 'Restored')
    setHistoryOpen(false)
  }

  const ctl: WriteCtl = {
    story,
    V,
    S,
    files,
    lineH,
    sel,
    blockHover,
    picker,
    panel,
    draft,
    chatInput,
    chatFocus,
    busy,
    chatError,
    magic,
    fancy,
    setSel,
    hoverBlock: setBlockHover,
    selectBlock,
    focusBlock,
    selText,
    togglePicker,
    pickType,
    setBlockText,
    setBlockPrompt,
    blockKey,
    openArtifactChat,
    pickMedia,
    deleteBlock,
    padDown,
    addNote,
    setNote,
    noteBlur,
    togglePanel,
    closePanel: () => setPanel(null),
    setDraft,
    pickBackdropImage,
    applyStyle,
    resetStyle,
    savePreset,
    setChatInput,
    sendChat,
    clearFocus,
  }

  const orb = (kind: 'data' | 'style' | 'chat', bg: string) => {
    const on = kind === 'chat' ? isChatPanel(panel) : panel?.kind === kind
    return (
      <button
        key={kind}
        aria-label={`Open ${kind}`}
        aria-pressed={on}
        title={
          kind === 'chat' && chatTarget(story, chatFocus?.id).kind === 'block'
            ? 'Chat about this block'
            : undefined
        }
        onClick={() => togglePanel(kind)}
        className="hover-full"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          height: 20,
          alignSelf: 'flex-start',
          opacity: on ? 1 : 0.6,
        }}
      >
        <span
          className="rail-control"
          style={{
            borderRadius: '50%',
            border: '1px solid currentColor',
            background: on ? 'currentColor' : bg,
            transition: 'background .2s',
            flex: 'none',
          }}
        />
        <span
          style={{
            ...mono,
            opacity: orbsHov ? 0.7 : 0,
            transition: 'opacity .2s',
          }}
        >
          {kind.toUpperCase()}
        </span>
      </button>
    )
  }

  return (
    <div
      className={`writing-page ${panelOpen ? 'panel-open' : ''}`}
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: bdOn ? 'transparent' : V.bg,
        color: V.ink,
        transition: 'background .4s, color .4s',
        position: 'relative',
      }}
    >
      <Backdrop view={V} base={V} />

      <div
        className="panel-slot"
        aria-hidden={!panelOpen}
        style={{
          width: panelOpen ? 380 : 0,
          flex: 'none',
          overflow: 'hidden',
          transition: `width .45s ${EASE}`,
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxSizing: 'border-box',
          zIndex: 6,
        }}
      >
        {panelOpen && <Panel ctl={ctl} />}
      </div>

      <div
        className={`essay-sheet ${card ? 'floating-paper' : ''}`}
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateRows: 'auto auto',
          alignContent: 'start',
          background: 'transparent',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="essay-header"
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 5,
            background: bdOn || card ? 'transparent' : `linear-gradient(${V.bg} 70%, rgba(${r},${g},${b},0))`,
          }}
        >
          <button
            className="essay-back rail-control hover-full"
            aria-label="All stories"
            onClick={goHome}
            style={{ font: `400 13px/1 ${SANS}` }}
          >
            <span aria-hidden="true" style={{ opacity: 0.5 }}>
              ←
            </span>
          </button>
          <div className="essay-status" style={mono}>
            <AIConnection />
            <span style={{ opacity: 0.45 }}>
              {wordCount(story).toLocaleString()} WORDS ·{' '}
              {saveError ? 'LOCAL SAVE FAILED' : saving ? 'SAVING LOCALLY…' : 'SAVED LOCALLY'}
              {cloudStatus ? ` · ${cloudStatus}` : ''}
            </span>
          </div>
        </div>

        <div className="essay-main" style={{ rowGap: V.gap }}>
          {card && <div className="floating-paper-surface" aria-hidden="true" style={{ background: V.bg }} />}
          <div className="essay-title">
            <AutoTextarea
              className="prose-input"
              data-id="title"
              placeholder="Untitled"
              value={story.title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              onFocus={clearFocus}
              style={{
                fontFamily: FONTS[V.headerFont],
                fontSize: 32,
                lineHeight: 1.15,
                letterSpacing: '-.4px',
              }}
            />
          </div>

          <div
            className="essay-orbs"
            onMouseEnter={() => setOrbsHov(true)}
            onMouseLeave={() => setOrbsHov(false)}
            style={{
              gridColumn: 1,
              gridRow: 2,
              position: 'sticky',
              top: 110,
              zIndex: 5,
              alignSelf: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: 26,
              alignItems: 'flex-start',
              padding: '0 20px 20px var(--rail-left)',
              justifySelf: 'start',
            }}
          >
            {orb('data', 'transparent')}
            {orb('style', 'conic-gradient(currentColor 0 50%, transparent 50%)')}
            {orb('chat', 'radial-gradient(circle, currentColor 0 3px, transparent 3.5px)')}
          </div>

          <div
            className="essay-content"
            style={{
              gridColumn: '1 / -1',
              gridRow: 2,
              padding: '0 0 40vh',
              display: 'grid',
              gridTemplateColumns: 'subgrid',
              alignContent: 'start',
              rowGap: V.gap,
              fontFamily: FONTS[V.bodyFont],
              fontSize: V.size,
              lineHeight: 1.75,
            }}
          >
            <Blocks ctl={ctl} />
            <StorySources sources={story.sources} />
          </div>
        </div>
        <History
          story={story}
          V={V}
          open={historyOpen}
          toggle={() => setHistoryOpen((v) => !v)}
          restore={restoreVersion}
        />
      </div>
    </div>
  )
}
