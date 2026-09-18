import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { AI } from '../ai'
import AIConnection from '../ai/AIConnection'
import { DEF_STYLE, EASE_PULL, HOME_THEMES, MONO, SANS, SHADOW, SHEET_BACK } from '../model/constants'
import { blankStory } from '../model/seed'
import type { HomeThemeKey, Story } from '../model/types'
import { clamp, easeInOut, excerptOf, newId, wordCount } from '../model/util'
import StoryOpening, { openingSurface, type OpeningSurface } from './StoryOpening'
import { gradientCss } from '../style/backgrounds'
import './home.css'

interface Props {
  stories: Story[]
  setStories: Dispatch<SetStateAction<Story[]>>
  theme: HomeThemeKey
  pickTheme: (k: HomeThemeKey) => void
  ai: AI
  onOpen: (id: string, isNew: boolean) => void
}

interface TileRect {
  left: number
  top: number
  width: number
  height: number
}

interface Ctx {
  id: string
  x: number
  y: number
  title: string
  renaming: boolean
  confirm: boolean
}

const SHEET_LEAN = 16
const DECK_OVERLAP = 40

const thumbOf = (s: Story) => {
  if (s.style.backdrop === 'gradient') return { bg: gradientCss(s.style), ink: s.style.ink }
  if (s.style.backdrop === 'image' && s.style.backdropSrc)
    return {
      bg: `url(${JSON.stringify(s.style.backdropSrc)}) center / cover ${s.style.bg}`,
      ink: s.style.ink,
    }
  return {
    bg: s.style.bg,
    ink: s.style.ink,
  }
}

export default function Home({ stories, setStories, theme, pickTheme, ai, onOpen }: Props) {
  const hb = HOME_THEMES[theme]
  const [p, setP] = useState(0)
  const [hover, setHover] = useState<string | null>(null)
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [styleOpen, setStyleOpen] = useState(false)
  const [opening, setOpening] = useState<{ id: string; fresh?: Story; surface: OpeningSurface } | null>(null)
  const openingRef = useRef(false)
  const openedRef = useRef(false)
  const [tiles, setTiles] = useState<TileRect[]>([])
  const [, tick] = useState(0)
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([])
  const sheetRefs = useRef(new Map<string, HTMLButtonElement>())
  const raf = useRef(0)

  // Scroll progress drives the flight; body wears the theme so overscroll matches.
  useEffect(() => {
    document.body.style.background = hb.bg
  }, [hb.bg])
  useEffect(() => {
    const onScroll = () => {
      if (raf.current) return
      raf.current = requestAnimationFrame(() => {
        raf.current = 0
        setP(clamp(window.scrollY / (window.innerHeight * 0.9)))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [])

  const measure = useCallback(() => {
    const arr = tileRefs.current.slice(0, 4).flatMap((el) => {
      if (!el) return []
      const r = el.firstElementChild!.getBoundingClientRect()
      return [
        {
          left: Math.round(r.left),
          top: Math.round(r.top + window.scrollY),
          width: Math.round(r.width),
          height: Math.round(r.height),
        },
      ]
    })
    setTiles((prev) => (JSON.stringify(prev) === JSON.stringify(arr) ? prev : arr))
  }, [])
  useLayoutEffect(measure)
  useEffect(() => {
    const onResize = () => {
      measure()
      tick((n) => n + 1)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure])

  // ---- geometry
  const vw = window.innerWidth
  const vh = window.innerHeight
  const D = vh * 0.9
  const e = easeInOut(p)
  const L = (a: number, b: number) => a + (b - a) * e
  const W = Math.min(300, (vw - 96) / 4.2)
  const step = W - Math.max(18, DECK_OVERLAP * 0.6)
  const H = Math.max(360, vh * 0.62)
  const cx = vw / 2
  const baseTop = vh * 1.3 - H
  const slots = [-2, -1, 0, 1, 2].map((k) => ({ x: cx - W / 2 + k * step, z: k + 3 }))
  const skew = `skewY(${-SHEET_LEAN * (1 - e)}deg)`
  const rest = p === 0 ? `transform .5s ${EASE_PULL}` : 'none'

  interface SheetVals {
    id: string
    isNew: boolean
    title: string
    excerpt: string
    bg: string
    ink: string
    left: string
    top: string
    w: string
    h: string
    z: number
    opacity: number
    transition: string
    transform: string
    shadow: string
    textOp: number
  }

  const sheetOf = (s: Story, slot: { x: number; z: number }, ti: number): SheetVals => {
    const hov = p === 0 && hover === s.id
    const th = thumbOf(s)
    const t = tiles[ti]
    const tx = t ? t.left : slot.x
    const ty = t ? t.top - D : baseTop
    const tw = t ? t.width : W
    const th2 = t ? t.height : H
    return {
      id: s.id,
      isNew: false,
      title: s.title || 'Untitled',
      excerpt: excerptOf(s),
      bg: th.bg,
      ink: th.ink,
      left: L(slot.x, tx) + 'px',
      top: L(baseTop, ty) + 'px',
      w: L(W, tw) + 'px',
      h: L(H, th2) + 'px',
      z: hov ? 9 : slot.z,
      opacity: 1,
      transition: rest,
      transform: hov
        ? `translateY(-${vh * 0.14}px) ${skew}`
        : `translateY(${-Math.sin(Math.PI * e) * 140}px) rotateY(${-28 * Math.sin(Math.PI * e)}deg) ${skew}`,
      shadow: SHADOW.sheet,
      textOp: 0.7,
    }
  }

  const deck: SheetVals[] = []
  if (stories[0]) deck.push(sheetOf(stories[0], slots[0], 0))
  if (stories[1]) deck.push(sheetOf(stories[1], slots[1], 1))
  deck.push({
    id: 'new',
    isNew: true,
    title: '',
    excerpt: '',
    bg: DEF_STYLE.bg,
    ink: DEF_STYLE.ink,
    left: slots[2].x + 'px',
    top: baseTop + e * vh * 0.5 + 'px',
    w: W + 'px',
    h: H + 'px',
    z: 3,
    opacity: 1 - Math.min(1, p * 2),
    transition: rest,
    transform: p === 0 && hover === 'new' ? `translateY(-${vh * 0.14}px) ${skew}` : skew,
    shadow: SHADOW.sheet,
    textOp: 0.7,
  })
  if (stories[2]) deck.push(sheetOf(stories[2], slots[3], 2))
  if (stories[3]) deck.push(sheetOf(stories[3], slots[4], 3))

  const lateFade = clamp((p - 0.5) / 0.5)
  const hs = hover && hover !== 'new' ? stories.find((s) => s.id === hover) : undefined
  const heroFade = opening ? 0 : 1 - Math.min(1, p / 0.4)
  const navOpacity = clamp((p - 0.7) / 0.3)

  // ---- actions
  const openStory = (sid: string, paper: HTMLElement | undefined, inDeck = false) => {
    if (openingRef.current) return
    const fresh = sid === 'new' ? blankStory() : undefined
    const target = fresh ?? stories.find((story) => story.id === sid)
    if (!target) return
    openingRef.current = true
    setHover(null)
    setCtx(null)
    setStyleOpen(false)
    if (!paper || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (fresh) setStories((arr) => [fresh, ...arr])
      onOpen(target.id, !!fresh)
      return
    }
    setOpening({
      id: target.id,
      fresh,
      surface: openingSurface(paper, fresh ? DEF_STYLE.bg : thumbOf(target).bg, inDeck),
    })
  }
  const finishOpening = useCallback(() => {
    if (!opening || openedRef.current) return
    openedRef.current = true
    const fresh = opening.fresh
    if (fresh) setStories((arr) => [fresh, ...arr])
    onOpen(opening.id, !!opening.fresh)
  }, [opening, onOpen, setStories])

  const ctxOpen = (ev: React.MouseEvent, sid: string) => {
    if (sid === 'new') return
    ev.preventDefault()
    const s = stories.find((x) => x.id === sid)
    setCtx({
      id: sid,
      x: ev.clientX,
      y: ev.clientY,
      title: s ? s.title : '',
      renaming: false,
      confirm: false,
    })
    setHover(null)
  }
  const ctxRenameKey = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Escape') return setCtx(null)
    if (ev.key !== 'Enter' || !ctx) return
    const t = ev.currentTarget.value
    const sid = ctx.id
    setStories((arr) => arr.map((s) => (s.id === sid ? { ...s, title: t } : s)))
    setCtx(null)
  }
  const ctxDuplicate = () => {
    if (!ctx) return
    const sid = ctx.id
    setStories((arr) => {
      const s = arr.find((x) => x.id === sid)
      if (!s) return arr
      const c: Story = JSON.parse(JSON.stringify(s))
      c.id = newId()
      c.title = (s.title || 'Untitled') + ' copy'
      c.date = 'TODAY'
      const out = [...arr]
      out.splice(arr.indexOf(s) + 1, 0, c)
      return out
    })
    setCtx(null)
  }
  const ctxDelete = () => {
    if (!ctx) return
    if (!ctx.confirm) return setCtx({ ...ctx, confirm: true })
    const sid = ctx.id
    setStories((arr) => arr.filter((s) => s.id !== sid))
    setCtx(null)
  }
  const homeStyleKey = async (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key !== 'Enter') return
    const el = ev.currentTarget
    const k = await ai.homeTheme(el.value)
    if (k) {
      pickTheme(k)
      el.value = ''
    }
  }

  const mono: CSSProperties = { font: `400 10px ${MONO}`, letterSpacing: '1.5px' }

  return (
    <div
      aria-busy={!!opening}
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: hb.bg,
        backgroundImage: hb.bgImage,
        color: hb.ink,
      }}
    >
      {/* Fixed hero layer: the stack */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          display: p >= 1 ? 'none' : 'block',
          pointerEvents: p > 0.02 ? 'none' : 'auto',
          perspective: '1600px',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: heroFade, transition: 'opacity .3s' }}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '22vh',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {!hs ? (
              <button
                aria-label="New Story"
                onClick={() => openStory('new', sheetRefs.current.get('new'), true)}
                onMouseEnter={() => setHover('new')}
                onMouseLeave={() => setHover(null)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
              >
                <span
                  style={{ height: 56, display: 'flex', alignItems: 'center', font: `300 40px/1 ${SANS}` }}
                >
                  +
                </span>
                <span style={{ font: `400 22px ${SANS}`, letterSpacing: '-.2px' }}>New Story</span>
              </button>
            ) : (
              <>
                <div style={{ height: 56 }} />
                <div
                  style={{
                    font: `400 22px ${SANS}`,
                    letterSpacing: '-.2px',
                    animation: 'fadein .25s ease both',
                  }}
                >
                  {hs.title || 'Untitled'}
                </div>
                <div style={{ ...mono, opacity: 0.55 }}>
                  {hs.date} · {wordCount(hs).toLocaleString()} WORDS
                </div>
              </>
            )}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 20,
              textAlign: 'center',
              ...mono,
              letterSpacing: '2px',
              opacity: 0.4,
            }}
          >
            SCROLL FOR ALL
          </div>
        </div>
        {deck.map((s) => (
          <button
            key={s.id}
            ref={(element) => {
              if (element) sheetRefs.current.set(s.id, element)
              else sheetRefs.current.delete(s.id)
            }}
            aria-label={s.isNew ? 'Open a blank story' : `Open ${s.title}`}
            onMouseEnter={() => setHover(s.id)}
            onMouseLeave={() => setHover(null)}
            onClick={(event) => openStory(s.id, event.currentTarget, true)}
            onContextMenu={(ev) => ctxOpen(ev, s.id)}
            style={{
              position: 'absolute',
              left: s.left,
              top: s.top,
              width: s.w,
              height: s.h,
              transform: s.transform,
              transformStyle: 'preserve-3d',
              zIndex: s.z,
              opacity: s.opacity,
              textAlign: 'left',
              transition: s.transition,
              willChange: 'transform',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                background: s.bg,
                color: s.ink,
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                boxShadow: s.shadow,
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  font: `500 12px/1.25 ${SANS}`,
                  maxWidth: 150,
                  marginBottom: 4,
                  opacity: s.textOp,
                  transition: 'opacity .3s',
                }}
              >
                {s.title}
              </div>
              <div
                style={{
                  font: `400 11px/1.6 ${SANS}`,
                  opacity: s.textOp,
                  maxWidth: 170,
                  overflow: 'hidden',
                  maxHeight: 230,
                  transition: 'opacity .3s',
                }}
              >
                {s.excerpt}
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg) translateZ(1px)',
                background: SHEET_BACK,
                boxSizing: 'border-box',
              }}
            />
          </button>
        ))}
      </div>

      {/* Nav bar */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top: 0,
          zIndex: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '34px 48px 16px',
          pointerEvents: 'none',
          background: `linear-gradient(${hb.bg} 60%, ${hb.bg}00)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 18,
            alignItems: 'baseline',
            opacity: navOpacity,
            pointerEvents: p >= 1 ? 'auto' : 'none',
          }}
        >
          <div style={{ font: `400 13px/1 ${SANS}` }}>All stories</div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            pointerEvents: 'auto',
            ...mono,
          }}
        >
          <AIConnection disconnectedLabel="Configure" connectedLabel="Configured" />
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setStyleOpen((v) => !v)}
              title="Style this page"
              className="hover-full"
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '1px solid currentColor',
                background: styleOpen ? 'currentColor' : 'conic-gradient(currentColor 0 50%, transparent 50%)',
                display: 'block',
                opacity: 0.7,
              }}
            />
            {styleOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 30,
                  width: 220,
                  padding: 16,
                  background: hb.panel,
                  color: hb.ink,
                  boxShadow: '0 20px 40px -20px rgba(0,0,0,.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  animation: 'fadein .2s ease both',
                }}
              >
                <div style={{ ...mono, opacity: 0.55 }}>YOUR HOMEPAGE</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(Object.keys(HOME_THEMES) as HomeThemeKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => pickTheme(k)}
                      title={HOME_THEMES[k].name}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: HOME_THEMES[k].bg,
                        outline: k === theme ? '1px solid currentColor' : '1px solid transparent',
                        outlineOffset: 3,
                      }}
                    />
                  ))}
                </div>
                <input
                  placeholder="or describe it: fog, dusk, a dark room…"
                  onKeyDown={homeStyleKey}
                  style={{
                    font: `400 12px/1.5 ${SANS}`,
                    borderBottom: '1px solid currentColor',
                    padding: '4px 0',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Library */}
      <div className="story-library">
        <div className="library-grid">
          {stories.map((s, i) => {
            const th = thumbOf(s)
            const op = i < 4 ? (p >= 1 ? 1 : 0) : lateFade
            return (
              <button
                className="library-story"
                key={s.id}
                ref={(el) => {
                  tileRefs.current[i] = el
                }}
                aria-label={`Open ${s.title || 'Untitled'}`}
                onClick={(event) => openStory(s.id, event.currentTarget.firstElementChild as HTMLElement)}
                onContextMenu={(ev) => ctxOpen(ev, s.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  minWidth: 0,
                  textAlign: 'left',
                  opacity: op,
                }}
              >
                <div
                  className="library-paper"
                  style={{
                    background: th.bg,
                    color: th.ink,
                    boxShadow: SHADOW.tile,
                  }}
                >
                  <div className="library-paper-title" style={{ font: `500 12px/1.25 ${SANS}` }}>
                    {s.title || 'Untitled'}
                  </div>
                  <div className="library-paper-excerpt" style={{ font: `400 11px/1.6 ${SANS}` }}>
                    {excerptOf(s)}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 12,
                    width: '100%',
                  }}
                >
                  <div style={{ font: `400 13px/1.3 ${SANS}` }}>{s.title || 'Untitled'}</div>
                  <div
                    style={{
                      font: `400 11px ${SANS}`,
                      opacity: 0.5,
                      textTransform: 'capitalize',
                      flex: 'none',
                    }}
                  >
                    {s.date}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {opening && <StoryOpening surface={opening.surface} onComplete={finishOpening} />}

      {/* Context menu */}
      {ctx && (
        <>
          <div
            onClick={() => setCtx(null)}
            onContextMenu={(ev) => {
              ev.preventDefault()
              setCtx(null)
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 60 }}
          />
          <div
            style={{
              position: 'fixed',
              left: ctx.x,
              top: ctx.y,
              zIndex: 61,
              background: hb.panel,
              color: hb.ink,
              boxShadow: SHADOW.popover,
              padding: '6px 0',
              minWidth: 150,
              animation: 'fadein .15s ease both',
            }}
          >
            {ctx.renaming ? (
              <input
                autoFocus
                defaultValue={ctx.title}
                onKeyDown={ctxRenameKey}
                style={{
                  font: `400 13px ${SANS}`,
                  padding: '8px 14px',
                  width: 220,
                  boxSizing: 'border-box',
                  borderBottom: '1px solid currentColor',
                  margin: '4px 14px 6px',
                }}
              />
            ) : (
              <>
                {[
                  ['Rename', () => setCtx({ ...ctx, renaming: true })],
                  ['Duplicate', ctxDuplicate],
                  [ctx.confirm ? 'Delete — sure?' : 'Delete', ctxDelete],
                ].map(([label, fn]) => (
                  <button
                    key={label as string}
                    onClick={fn as () => void}
                    className="hover-row"
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      font: `400 13px ${SANS}`,
                      padding: '8px 16px',
                      opacity: 0.85,
                    }}
                  >
                    {label as string}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
