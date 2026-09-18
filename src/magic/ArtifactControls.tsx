import { useState } from 'react'
import type { MagicBlock } from '../model/types'
import type { WriteCtl } from '../write/ctl'
import { readAttachment } from './data'
import { marginInstruction } from './state'
import { generationMode } from './provider'

export function LayoutSelect({ b, ctl }: { b: MagicBlock; ctl: WriteCtl }) {
  return (
    <div className="artifact-layout" role="group" aria-label="Artifact width">
      {(['column', 'full-bleed'] as const).map((layout) => (
        <button
          key={layout}
          aria-pressed={(b.layout || 'column') === layout}
          onClick={() => ctl.magic.setLayout(b.id, layout)}
        >
          {layout === 'column' ? 'Column' : 'Full bleed'}
        </button>
      ))}
    </div>
  )
}

export function GenerationSelect({ b, ctl }: { b: MagicBlock; ctl: WriteCtl }) {
  const available = b.mode === 'image' ? ctl.magic.imagesConnected : ctl.magic.connected
  return (
    <select
      className="generation-select"
      aria-label="Generation provider"
      disabled={b.status === 'rendering'}
      value={generationMode(b.provider, ctl.magic.connected) === 'connected' ? 'live' : 'preview'}
      onChange={(e) =>
        ctl.magic.setProvider(b.id, e.currentTarget.value === 'live' ? 'connected' : 'preview')
      }
    >
      <option value="preview">Design sample</option>
      <option value="live" disabled={!available}>
        Connected generation{!available ? ' · not connected' : ''}
      </option>
    </select>
  )
}

export function Attachments({ b, ctl }: { b: MagicBlock; ctl: WriteCtl }) {
  const [error, setError] = useState('')
  return (
    <div className="magic-attachments">
      {b.attachments.map((a) => (
        <span key={a.id} className="attachment-chip">
          {a.name}
          <button
            disabled={b.status === 'rendering'}
            aria-label={`Remove ${a.name}`}
            onClick={() => ctl.magic.detach(b.id, a.id)}
          >
            ×
          </button>
        </span>
      ))}
      <label className="attach-button">
        + {b.mode === 'data' ? 'Attach data' : 'Attach reference'}
        <input
          aria-label={`Attach files to ${b.mode} block`}
          type="file"
          accept={b.mode === 'data' ? '.csv,.tsv' : '.png,.jpg,.jpeg,.webp,.csv,.tsv'}
          multiple
          disabled={b.status === 'rendering'}
          onChange={async (e) => {
            const files = [...(e.currentTarget.files || [])]
            e.currentTarget.value = ''
            setError('')
            try {
              if (files.length + b.attachments.length > 4)
                throw new Error('Keep up to four attachments in a magic block.')
              ctl.magic.attach(b.id, await Promise.all(files.map(readAttachment)))
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Could not read that file.')
            }
          }}
        />
      </label>
      {error && <div role="alert">{error}</div>}
    </div>
  )
}

export default function ArtifactControls({ b, ctl }: { b: MagicBlock; ctl: WriteCtl }) {
  const working = b.status === 'rendering'
  return (
    <div className="artifact-details">
      <LayoutSelect b={b} ctl={ctl} />
      {b.mode === 'image' && (
        <button
          disabled={working || !ctl.magic.imagesConnected}
          title="Generate a transparent version; the original stays in Versions"
          onClick={() => void ctl.magic.removeBackground(b.id)}
        >
          Remove background
        </button>
      )}
      <details>
        <summary>Sources & generation</summary>
        <Attachments b={b} ctl={ctl} />
        <GenerationSelect b={b} ctl={ctl} />
        <button
          disabled={working || !marginInstruction(b).trim()}
          onClick={() => void ctl.magic.generate(b.id)}
          style={{ display: 'block', marginTop: 8 }}
        >
          Regenerate
        </button>
      </details>
      <details>
        <summary>Versions</summary>
        <div className="artifact-version">
          <button
            disabled={b.revision < 1 || working}
            onClick={() => ctl.magic.restore(b.id, b.revision - 1)}
          >
            Undo edit
          </button>
          <span>
            VERSION {b.revision + 1} / {b.revisions.length}
          </span>
          <button
            disabled={b.revision >= b.revisions.length - 1 || working}
            onClick={() => ctl.magic.restore(b.id, b.revision + 1)}
          >
            Redo
          </button>
        </div>
      </details>
      {ctl.story.notes[b.id] && (
        <details>
          <summary>Original note</summary>
          <p>{ctl.story.notes[b.id]}</p>
        </details>
      )}
    </div>
  )
}
