import type { Story } from '../model/types'

/** Quiet, optional provenance rather than a second footer below every block. */
export default function StorySources({ sources }: Pick<Story, 'sources'>) {
  if (!sources?.length) return null
  return (
    <details className="story-sources">
      <summary>Source notes</summary>
      <ul>
        {sources.map(({ label, url }) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              download={/\.csv(?:[?#]|$)|^data:text\/csv/i.test(url) ? '' : undefined}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
