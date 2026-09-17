import { useLayoutEffect, useRef } from 'react'

export interface OpeningSurface {
  left: number
  top: number
  width: number
  height: number
  transform: string
  background: string
}

/** Capture the paper, not the title or metadata below a library tile. */
export function openingSurface(element: HTMLElement, background: string, inDeck = false): OpeningSurface {
  const rect = element.getBoundingClientRect()
  return {
    left: inDeck ? element.offsetLeft : rect.left,
    top: inDeck ? element.offsetTop : rect.top,
    width: inDeck ? element.offsetWidth : rect.width,
    height: inDeck ? element.offsetHeight : rect.height,
    transform: inDeck ? getComputedStyle(element).transform : 'none',
    background,
  }
}

/** One continuous paper movement; the editor is ready as soon as it fills the view. */
export default function StoryOpening({
  surface,
  onComplete,
}: {
  surface: OpeningSurface
  onComplete: () => void
}) {
  const paper = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = paper.current
    if (!element) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches || typeof element.animate !== 'function') {
      onComplete()
      return
    }

    let settled = false
    let animation: Animation | undefined
    const finish = () => {
      if (settled) return
      settled = true
      onComplete()
    }
    // A browser cancellation or viewport change must never strand the opening.
    const fallback = window.setTimeout(finish, 360)
    const onMotionChange = () => {
      if (motion.matches) finish()
    }
    window.addEventListener('resize', finish, { once: true })
    motion.addEventListener('change', onMotionChange)
    try {
      animation = element.animate(
        [
          {
            left: `${surface.left}px`,
            top: `${surface.top}px`,
            width: `${surface.width}px`,
            height: `${surface.height}px`,
            transform: surface.transform,
          },
          {
            left: '0px',
            top: '0px',
            width: '100vw',
            height: '100vh',
            transform: 'none',
          },
        ],
        { duration: 260, easing: 'cubic-bezier(.22,.7,.22,1)', fill: 'both' },
      )
      void animation.finished.then(finish, finish)
    } catch {
      finish()
    }
    return () => {
      settled = true
      window.clearTimeout(fallback)
      window.removeEventListener('resize', finish)
      motion.removeEventListener('change', onMotionChange)
      animation?.cancel()
    }
  }, [surface, onComplete])

  return (
    <div
      aria-hidden="true"
      data-testid="story-opening"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        overflow: 'hidden',
        cursor: 'progress',
      }}
    >
      <div ref={paper} style={{ position: 'absolute', ...surface, transformOrigin: '50% 50%' }} />
    </div>
  )
}
