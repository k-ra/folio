import { useEffect, useMemo, useState } from 'react'
import { backgroundDocument } from './backgrounds'

/** A visual layer only: no scripts, same-origin privileges, storage, links or network. */
export default function CustomBackground({ code, fallback }: { code: string; fallback: string }) {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const document = useMemo(
    () => backgroundDocument(code, fallback, reducedMotion),
    [code, fallback, reducedMotion],
  )
  return (
    <iframe
      title="Custom background"
      aria-hidden="true"
      tabIndex={-1}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={document}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
