import { useState } from 'react'
import type { Story } from '../model/types'
import { backup, download, filename, storyText } from './backup'
import { publicationDownload } from './export'

export default function StoryDownloads({ story }: { story: Story }) {
  const [choosing, setChoosing] = useState(false),
    [notes, setNotes] = useState(false)
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const act = async (fn: () => Promise<void> | void) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not download.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="info-actions story-downloads">
      <button
        disabled={busy}
        onClick={() =>
          void act(async () => {
            const text = storyText(story)
            if (navigator.clipboard) await navigator.clipboard.writeText(text)
            else {
              const field = document.createElement('textarea')
              field.value = text
              field.style.cssText = 'position:fixed;opacity:0'
              document.body.append(field)
              field.select()
              const copied = document.execCommand('copy')
              field.remove()
              if (!copied) throw new Error('Clipboard unavailable. Download the story instead.')
            }
            setMessage('Copied.')
          })
        }
      >
        Copy text
      </button>
      <div className="download-choice">
        <button aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>
          Download
        </button>
        {choosing && (
          <>
            <button
              disabled={busy}
              title="Publication: HTML, or a ZIP when images or datasets are included"
              onClick={() =>
                void act(async () => {
                  const file = await publicationDownload(story, notes)
                  download(file.data as BlobPart, file.type, filename(story) + file.extension)
                  setMessage(file.notice)
                })
              }
            >
              HTML
            </button>
            <button
              disabled={busy}
              title="Editable backup, including private notes, chats and history"
              onClick={() =>
                void act(() => {
                  download(backup(story), 'application/json', filename(story) + '.folio')
                  setMessage('Backup includes private notes, chats and history.')
                })
              }
            >
              .folio
            </button>
          </>
        )}
      </div>
      <label className="publication-notes">
        <input type="checkbox" checked={notes} onChange={(e) => setNotes(e.currentTarget.checked)} /> Include
        margin notes in publication
      </label>
      {busy && <small role="status">Preparing…</small>}
      {message && <small role="status">{message}</small>}
      {error && <small role="alert">{error}</small>}
    </div>
  )
}
