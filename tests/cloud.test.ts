import { describe, it, expect } from 'vitest'
import { example } from './storyFixture'
import { StorySync } from '../src/cloud/sync'
import { fingerprint, type CloudRow, type CloudTransport } from '../src/cloud/transport'

describe('cloud compare-and-swap and recovery', () => {
  const fake = () => {
    const rows = new Map<string, CloudRow>()
    let fail = false,
      lost = false,
      writes = 0
    const api: CloudTransport = {
      list: async () => [...rows.values()],
      save: async (id, expected, story) => {
        if (fail) throw new Error('Network unavailable')
        const old = rows.get(id)
        if ((old?.version || 0) !== expected) throw new Error('Conflict')
        const row = { id, version: expected + 1, story }
        rows.set(id, row)
        writes++
        if (lost) throw new Error('Response lost')
        return row
      },
    }
    return {
      api,
      rows,
      setFail: (b: boolean) => {
        fail = b
      },
      setLost: (b: boolean) => {
        lost = b
      },
      writes: () => writes,
    }
  }
  it('recovers from failure and a lost acknowledgement without duplicating or losing content', async () => {
    const f = fake(),
      s = example(),
      sync = new StorySync({}, f.api, async () => {})
    f.setFail(true)
    await expect(sync.sync([s], () => true)).rejects.toThrow('Network')
    expect(sync.checkpoint).toEqual({})
    f.setFail(false)
    f.setLost(true)
    await expect(sync.sync([s], () => true)).rejects.toThrow('Response')
    f.setLost(false)
    await sync.sync([s], () => true)
    expect(f.writes()).toBe(1)
    expect(sync.checkpoint[s.id].version).toBe(1)
  })
  it('blocks another device overwrite, pulls clean updates, and defers downloads during typing', async () => {
    const f = fake(),
      s = example(),
      a = new StorySync({}, f.api, async () => {})
    await a.sync([s], () => true)
    const b = new StorySync(structuredClone(a.checkpoint), f.api, async () => {})
    await a.sync([{ ...s, title: 'Device A' }], () => true)
    await b.sync([{ ...s, title: 'Device B' }], () => true)
    expect(b.conflicts).toHaveLength(1)
    expect(f.rows.get(s.id)?.story?.title).toBe('Device A')
    await b.sync([s], () => false)
    expect(b.checkpoint[s.id].version).toBe(1)
    let downloaded = ''
    await b.sync([s], (_id, _before, remote) => {
      downloaded = remote!.title
      return true
    })
    expect(downloaded).toBe('Device A')
    expect(b.checkpoint[s.id].version).toBe(2)
  })
  it('retains deletion tombstones and never silently resurrects a stale edited story', async () => {
    const f = fake(),
      s = example(),
      sync = new StorySync({}, f.api, async () => {})
    await sync.sync([s], () => true)
    const stale = new StorySync(structuredClone(sync.checkpoint), f.api, async () => {})
    await sync.sync([], () => true)
    expect(f.rows.get(s.id)?.story).toBeNull()
    await stale.sync([{ ...s, title: 'Offline edits' }], () => true)
    expect(stale.conflicts).toHaveLength(1)
  })
  it('hashes equivalent object key order identically', async () => {
    expect(await fingerprint({ a: 1, b: 2 })).toBe(await fingerprint({ b: 2, a: 1 }))
  })
})
