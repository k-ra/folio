import type { Story } from '../model/types'
import type { CloudRow, CloudTransport } from './transport'
import { fingerprint } from './transport'

export type Checkpoint = Record<string, { version: number; hash: string }>
export interface Conflict {
  id: string
  remote: CloudRow
}

/** One serialized sync pass. Callers apply downloads only if local edits have not changed. */
export class StorySync {
  conflicts: Conflict[] = []
  constructor(
    public checkpoint: Checkpoint,
    private api: CloudTransport,
    private persist: (state: Checkpoint) => Promise<unknown>,
  ) {}
  async sync(
    stories: Story[],
    accept: (id: string, snapshot: Story | null, remote: Story | null) => boolean,
  ) {
    const rows = await this.api.list()
    const remote = new Map(rows.map((r) => [r.id, r]))
    const local = new Map(stories.map((s) => [s.id, s]))
    const ids = new Set([...local.keys(), ...remote.keys(), ...Object.keys(this.checkpoint)])
    this.conflicts = []
    for (const id of ids) {
      const story = local.get(id) || null,
        row = remote.get(id),
        base = this.checkpoint[id]
      const hash = await fingerprint(story)
      const remoteHash = await fingerprint(row?.story || null)
      if (row && hash === remoteHash) {
        this.checkpoint[id] = { version: row.version, hash }
      } else if (row && ((!base && !story) || (base && hash === base.hash))) {
        if (accept(id, story, row.story)) this.checkpoint[id] = { version: row.version, hash: remoteHash }
      } else if (row && (!base || row.version !== base.version)) {
        this.conflicts.push({ id, remote: row })
      } else if (!row && base) {
        // Remote deletion outside the supported tombstone protocol is also a conflict.
        this.conflicts.push({ id, remote: { id, version: 0, story: null } })
      } else if ((!base && story) || (base && hash !== base.hash)) {
        const saved = await this.api.save(id, base?.version || 0, story)
        this.checkpoint[id] = { version: saved.version, hash }
      }
    }
    await this.persist(this.checkpoint)
  }
}
