import type { Style } from '../model/types'
import { isDark } from '../model/util'
import Shader from './Shader'
import CustomBackground from '../style/CustomBackground'
import { gradientCss } from '../style/backgrounds'

/**
 * The layer behind the paper. `style.backdrop` decides what it is; the
 * essay's fallback colour decides whether it is a light or dark field.
 */
export default function Backdrop({
  view,
  base,
  contained = false,
}: {
  view: Style
  base: Style
  contained?: boolean
}) {
  const on = view.backdrop && view.backdrop !== 'none'
  if (!on) return null
  const dark = isDark(base.bg)
  const card = view.paper === 'card'
  const drift = view.backdrop === 'drift'
  const gradient = view.backdrop === 'gradient'
  const moving = drift || (gradient && view.backgroundMotion)
  const css = gradient
    ? gradientCss(view)
    : drift
      ? dark
        ? 'linear-gradient(120deg, #1a1a1f, #3a3f52, #1f2a2a, #2b2333)'
        : 'linear-gradient(120deg, #ffffff, #d9d9d9, #f2efe9, #c9ccd2)'
      : base.bg
  return (
    <div
      className={contained ? 'style-study-backdrop' : 'page-backdrop'}
      data-backdrop={view.backdrop}
      style={{
        position: contained ? 'absolute' : 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: css,
        backgroundSize: moving ? '300% 300%' : 'auto',
        animation: moving ? 'drift 24s ease-in-out infinite' : 'none',
      }}
    >
      {view.backdrop === 'image' && view.backdropSrc && (
        <img
          src={view.backdropSrc}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scale(1.04)',
          }}
        />
      )}
      {view.backdrop === 'shader' && <Shader dark={dark} />}
      {view.backdrop === 'custom' && view.backgroundCode && (
        <CustomBackground code={view.backgroundCode} fallback={view.bg} />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: card ? (dark ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.12)') : 'transparent',
        }}
      />
    </div>
  )
}
