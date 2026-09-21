import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Story } from '../model/types'
import { cloudCheckpoint, loadWorkspace, saveWorkspace } from '../model/storage'
import { newId } from '../model/util'
import { StorySync, type Checkpoint, type Conflict } from './sync'
import { fingerprint, transportFor } from './transport'

export function useCloud(
  owner: string | undefined,
  stories: Story[],
  setStories: Dispatch<SetStateAction<Story[]>>,
  ready: boolean,
) {
  const current = useRef(stories)
  current.current = stories
  const engine = useRef<StorySync>()
  const busy = useRef(false)
  const alive = useRef(true)
  const [error, setError] = useState('')
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [saved, setSaved] = useState<Story[] | null>(null)
  const [browserCount, setBrowserCount] = useState(0)
  const [importMessage, setImportMessage] = useState('')
  const [tick, setTick] = useState(0)
  const retry = () => setTick((n) => n + 1)
  const transport = owner ? transportFor(owner) : null
  useEffect(() => {
    alive.current = true
    if (!owner) return
    void loadWorkspace()
      .then((s) => {
        if (alive.current) setBrowserCount(s?.length || 0)
      })
      .catch(() => {})
    const interval = setInterval(retry, 15000)
    window.addEventListener('online', retry)
    window.addEventListener('focus', retry)
    return () => {
      alive.current = false
      clearInterval(interval)
      window.removeEventListener('online', retry)
      window.removeEventListener('focus', retry)
    }
  }, [owner])
  useEffect(() => {
    if (!owner || !ready || !transport) return
    const timer = setTimeout(async () => {
      if (busy.current || !alive.current) return
      busy.current = true
      const snapshot = current.current
      try {
        if (!engine.current)
          engine.current = new StorySync(
            (await cloudCheckpoint<Checkpoint>(owner)) || {},
            transport,
            async (v) => {
              // Never advance the durable base before the downloaded/local snapshot is durable.
              // A crash after the first write is safe: the next pass reconciles by fingerprint.
              await saveWorkspace(current.current, owner)
              await cloudCheckpoint(owner, v)
            },
          )
        await engine.current.sync(snapshot, (id, before, remote) => {
          if (
            !alive.current ||
            JSON.stringify(current.current.find((s) => s.id === id) || null) !== JSON.stringify(before)
          )
            return false
          const next = current.current.filter((s) => s.id !== id)
          if (remote) next.push(remote)
          current.current = next
          setStories(next)
          return true
        })
        if (alive.current) {
          setConflicts([...engine.current.conflicts])
          setSaved(snapshot)
          setError('')
        }
      } catch (e) {
        if (alive.current)
          setError(e instanceof Error ? e.message : 'Cloud save failed. Local edits remain available.')
      } finally {
        busy.current = false
        if (alive.current && current.current !== snapshot) retry()
      }
    }, 750)
    return () => clearTimeout(timer)
  }, [owner, ready, stories, tick, setStories])
  const importBrowser = async () => {
    if (!owner || !transport) return
    if (busy.current) throw new Error('Cloud saving is in progress. Please try importing again shortly.')
    busy.current = true
    try {
      // Explicit consent is the only route from the guest workspace to the account.
      const browser = (await loadWorkspace()) || []
      const existing = new Set([
        ...(await transport.list()).map((s) => s.id),
        ...current.current.map((s) => s.id),
      ])
      let imported = 0
      for (const story of browser) {
        if (existing.has(story.id)) continue
        try {
          await transport.save(story.id, 0, story)
          imported++
        } catch (e) {
          if (!(e instanceof Error && e.message.startsWith('Conflict:'))) throw e
        }
      }
      setImportMessage(
        `${imported} imported. Existing cloud stories were skipped; browser originals are unchanged.`,
      )
      setError('')
    } catch (e) {
      setError(`Import incomplete; retry is safe. ${e instanceof Error ? e.message : ''}`)
    } finally {
      busy.current = false
      retry()
    }
  }
  const keepBoth = async (conflict: Conflict) => {
    if (!engine.current || !owner) return
    if (busy.current) throw new Error('Cloud saving is in progress. Please try resolving again shortly.')
    const hash = await fingerprint(conflict.remote.story)
    if (!alive.current) return
    const local = current.current.find((s) => s.id === conflict.id)
    const next = current.current.filter((s) => s.id !== conflict.id)
    if (local)
      next.unshift({
        ...local,
        id: newId(),
        title: `${local.title} (device copy)`,
      })
    if (conflict.remote.story) next.push(conflict.remote.story)
    engine.current.checkpoint[conflict.id] = {
      version: conflict.remote.version,
      hash,
    }
    current.current = next
    setStories(next)
    setConflicts((c) => c.filter((x) => x.id !== conflict.id))
    retry()
  }
  return {
    error,
    conflicts,
    browserCount,
    importMessage,
    importBrowser,
    keepBoth,
    retry,
    status: !owner
      ? 'LOCAL SAVED'
      : error
        ? 'CLOUD ERROR'
        : conflicts.length
          ? 'CLOUD CONFLICT'
          : saved === stories
            ? 'CLOUD SAVED'
            : 'CLOUD PENDING',
  }
}
export type CloudState = ReturnType<typeof useCloud>
