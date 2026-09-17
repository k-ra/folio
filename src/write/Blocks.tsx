import type { CSSProperties } from 'react'
import { FONTS, MONO } from '../model/constants'
import type { Block } from '../model/types'
import AutoTextarea from '../ui/AutoTextarea'
import type { WriteCtl } from './ctl'
import MagicBlock from '../magic/MagicBlock'
import MarginNote from './MarginNote'
import FancyBlock from '../fancy/FancyBlock'

const mono: CSSProperties = { font: `400 10px ${MONO}`, letterSpacing: '1.5px' }
const hairline: CSSProperties = {
  display: 'flex',
  gap: 16,
  alignItems: 'baseline',
  borderTop: '1px solid currentColor',
  paddingTop: 10,
}

export default function Blocks({ ctl }: { ctl: WriteCtl }) {
  return (
    <>
      {ctl.story.blocks.map((b, i) => (
        <BlockRow key={b.id} ctl={ctl} b={b} i={i} />
      ))}
    </>
  )
}

function BlockRow({ ctl, b, i }: { ctl: WriteCtl; b: Block; i: number }) {
  const { V, story } = ctl
  const sel = ctl.sel === b.id
  const hov = ctl.blockHover === b.id
  const pickerOpen = ctl.picker === b.id
  const text = 'text' in b ? b.text : ''
  const showPlus = b.type === 'text' && !b.text && (sel || hov || pickerOpen)
  const showDelete = b.type !== 'text' && (sel || hov)
  const hasNote = story.notes[b.id] !== undefined
  const fullBleed =
    b.type === 'magic' && b.layout === 'full-bleed' && (b.revision >= 0 || b.status === 'rendering')
  const showNoteGhost =
    !hasNote &&
    (sel || hov) &&
    b.type !== 'padding' &&
    b.type !== 'magic' &&
    b.type !== 'fancy' &&
    (!!text || b.type !== 'text')
  const placeholder =
    i === 0 && !text ? 'Begin.' : !text && (sel || hov) ? 'keep writing, or press + to add a block' : ''

  return (
    <div
      data-block-id={b.id}
      className={fullBleed ? 'block-row-full-bleed' : undefined}
      onMouseEnter={() => ctl.hoverBlock(b.id)}
      onMouseLeave={() => ctl.hoverBlock(null)}
      onClick={() => ctl.selectBlock(b.id)}
      style={{
        position: 'relative',
        display: fullBleed ? 'grid' : 'flex',
        gridTemplateColumns: fullBleed ? 'subgrid' : undefined,
        flexDirection: 'column',
        rowGap: 14,
      }}
    >
      {showPlus && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            ctl.togglePicker(b.id)
          }}
          title="Add a block: magic, upload, padding or fancy text"
          style={{
            position: 'absolute',
            zIndex: 6,
            left: -56,
            top: 0,
            width: 28,
            height: ctl.lineH,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: `300 26px/1 ${FONTS['Instrument Sans']}`,
            opacity: pickerOpen ? 1 : 0.45,
            transform: pickerOpen ? 'rotate(45deg)' : 'none',
            transition: 'transform .25s, opacity .2s',
          }}
        >
          <span style={{ display: 'block', marginTop: -3 }}>+</span>
        </button>
      )}

      {pickerOpen && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: `8px 28px`,
            minHeight: ctl.lineH,
            fontSize: V.size,
            animation: 'fadein .2s ease both',
          }}
        >
          {(['magic', 'media', 'padding', 'fancy'] as const).map((t) => (
            <button
              key={t}
              className="hover-line"
              onClick={(e) => {
                e.stopPropagation()
                ctl.pickType(b.id, t)
              }}
              style={{ opacity: 0.55, borderBottom: '1px solid transparent', whiteSpace: 'nowrap' }}
            >
              {t === 'fancy' ? 'fancy text' : t === 'magic' ? '✳ magic' : t === 'media' ? 'upload' : t}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', ...mono, opacity: 0.4 }}>OR KEEP TYPING</span>
        </div>
      )}

      {b.type === 'text' && (
        <AutoTextarea
          className="prose-input"
          data-id={b.id}
          placeholder={placeholder}
          value={b.text}
          onChange={(e) => ctl.setBlockText(b.id, e.currentTarget.value)}
          onKeyDown={(e) => ctl.blockKey(e, b.id)}
          onFocus={() => ctl.focusBlock(b.id)}
          onSelect={(e) => {
            const el = e.currentTarget
            ctl.selText(b.id, el.value.slice(el.selectionStart, el.selectionEnd).trim())
          }}
          style={{ textWrap: 'pretty' } as CSSProperties}
        />
      )}

      {b.type === 'fancy' && <FancyBlock b={b} ctl={ctl} />}

      {b.type === 'magic' && <MagicBlock ctl={ctl} b={b} />}

      {b.type === 'media' &&
        (!b.src ? (
          <label
            style={{
              border: '1px dashed rgba(128,128,128,.5)',
              height: 180,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 13,
              opacity: 0.6,
              cursor: 'pointer',
            }}
          >
            <span>drop an image, or click to choose</span>
            <span style={mono}>JPG · PNG · SVG</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0]
                if (f) ctl.pickMedia(b.id, f)
              }}
              style={{ display: 'none' }}
            />
          </label>
        ) : (
          <>
            <img
              src={b.src}
              alt=""
              style={{ width: '100%', display: 'block', animation: 'fadein 1.2s ease both' }}
            />
            <div style={{ ...hairline, gap: 14, paddingTop: 8, marginTop: 10 }}>
              <span style={{ ...mono, opacity: 0.5, flex: 'none' }}>CAPTION</span>
              <AutoTextarea
                data-id={b.id}
                placeholder="what the reader should know about this image"
                value={b.text}
                onChange={(e) => ctl.setBlockText(b.id, e.currentTarget.value)}
                onKeyDown={(e) => ctl.blockKey(e, b.id)}
                style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.75, flex: 1 }}
              />
            </div>
          </>
        ))}

      {b.type === 'padding' && (
        <div
          style={{
            position: 'relative',
            height: b.h,
            outline: sel || hov ? '1px dashed rgba(128,128,128,.4)' : '1px dashed transparent',
            transition: 'outline-color .2s',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -64,
              top: '50%',
              transform: 'translateY(-50%)',
              ...mono,
              opacity: sel || hov ? 1 : 0,
            }}
          >
            {b.h}
          </div>
          <div
            onMouseDown={(e) => ctl.padDown(e, b.id, b)}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: -6,
              width: 24,
              height: 11,
              marginLeft: -12,
              border: '1px solid currentColor',
              background: V.bg,
              borderRadius: 6,
              cursor: 'ns-resize',
              opacity: sel || hov ? 1 : 0,
            }}
          />
        </div>
      )}

      {hasNote && b.type !== 'magic' && b.type !== 'fancy' && (
        <MarginNote label="Margin note">
          <AutoTextarea
            className="prose-input"
            data-id={'n-' + b.id}
            placeholder="a note in the margin"
            value={story.notes[b.id]}
            onChange={(e) => ctl.setNote(b.id, e.currentTarget.value)}
            onBlur={() => ctl.noteBlur(b.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: FONTS[V.bodyFont] }}
          />
        </MarginNote>
      )}
      {showNoteGhost && (
        <button
          className="note-add"
          onClick={(e) => {
            e.stopPropagation()
            ctl.addNote(b.id)
          }}
          style={{
            position: 'absolute',
            top: 4,
            left: 'calc(100% + var(--margin-gap))',
            ...mono,
            opacity: 0.3,
            animation: 'fadein .2s ease both',
            whiteSpace: 'nowrap',
            transition: 'opacity .2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '.8')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '.3')}
        >
          + NOTE
        </button>
      )}
      {showDelete && (
        <button
          className="hover-full block-delete"
          aria-label="Remove block"
          onClick={(e) => {
            e.stopPropagation()
            ctl.deleteBlock(b.id)
          }}
          style={{
            position: 'absolute',
            left: -52,
            top: '50%',
            transform: 'translateY(-50%)',
            height: ctl.lineH,
            width: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...mono,
            opacity: 0.35,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
