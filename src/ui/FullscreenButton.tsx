import { useEffect, useState } from 'react'
import './fullscreen.css'

export default function FullscreenButton() {
  const [active, setActive] = useState(!!document.fullscreenElement)
  const [error, setError] = useState('')
  useEffect(() => {
    const update = () => {
      setActive(!!document.fullscreenElement)
      setError('')
    }
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])
  const supported = !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false
  const label = active ? 'Exit fullscreen' : 'Fullscreen'
  return (
    <span className="fullscreen-control">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={!supported}
        title={supported ? label : 'Fullscreen is unavailable in this browser'}
        onClick={async () => {
          try {
            if (document.fullscreenElement) await document.exitFullscreen()
            else await document.documentElement.requestFullscreen()
          } catch {
            setError('Fullscreen is unavailable. Try your browser’s fullscreen command.')
          }
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          aria-hidden="true"
        >
          <path
            d={active ? 'M1 5h4V1M11 1v4h4M15 11h-4v4M5 15v-4H1' : 'M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5'}
          />
        </svg>
      </button>
      {error && (
        <span className="fullscreen-error" role="alert">
          {error}
        </span>
      )}
    </span>
  )
}
