import type { ReactNode } from 'react'

/** The shared right-hand margin for notes and artifact instructions. */
export default function MarginNote({
  children,
  label,
  className = '',
}: {
  children: ReactNode
  label: string
  className?: string
}) {
  return (
    <aside className={`margin-note ${className}`} aria-label={label} onClick={(e) => e.stopPropagation()}>
      {children}
    </aside>
  )
}
