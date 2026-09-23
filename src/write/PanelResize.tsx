import { useState } from 'react'
export const DEFAULT_PANEL_WIDTH = 380
export const panelLimit = () =>
  Math.max(260, Math.min(720, innerWidth <= 900 ? innerWidth * 0.94 : innerWidth - 360))
export default function PanelResize({
  width,
  resize,
  maxWidth = panelLimit(),
}: {
  width: number
  resize: (width: number) => void
  maxWidth?: number
}) {
  const [dragging, setDragging] = useState(false)
  const clamp = (n: number) => Math.max(260, Math.min(maxWidth, n))
  return (
    <div
      className={`panel-resize ${dragging ? 'is-dragging' : ''}`}
      role="separator"
      aria-label="Chat width"
      aria-orientation="vertical"
      aria-valuemin={260}
      aria-valuemax={maxWidth}
      aria-valuenow={Math.round(clamp(width))}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
      }}
      onPointerMove={(e) => {
        if (dragging) resize(clamp(e.clientX))
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId)
        setDragging(false)
      }}
      onPointerCancel={() => setDragging(false)}
      onLostPointerCapture={() => setDragging(false)}
      onDoubleClick={() => resize(DEFAULT_PANEL_WIDTH)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          resize(clamp(clamp(width) + (e.key === 'ArrowRight' ? 20 : -20)))
        }
        if (e.key === 'Home') {
          e.preventDefault()
          resize(DEFAULT_PANEL_WIDTH)
        }
      }}
    />
  )
}
