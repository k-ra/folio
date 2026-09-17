import { useCallback, useEffect, useMemo, useState } from 'react'
import { STORAGE_HOME, STORAGE_STORIES } from './constants'
import { seed } from './seed'
import type { Block, HomeThemeKey, Story } from './types'
import { wordCount } from './util'
import { migrateStory } from './migrate'
import { loadWorkspace, saveWorkspace } from './storage'

/**
 * Legacy localStorage is a read-only fallback until IndexedDB loads.
 * Workspace writes go through the storage adapter below.
 */
function load(): Story[] {
  try {
    const raw = localStorage.getItem(STORAGE_STORIES) || localStorage.getItem('folio.stories.v1')
    const arr = raw ? (JSON.parse(raw) as Story[]) : null
    if (Array.isArray(arr)) return arr.map(migrateStory)
  } catch {
    /* ignore */
  }
  return seed().map(migrateStory)
}

export type StoryUpdater = (s: Story) => Story

/**
 * Every story mutation passes through `upStory(id, fn, why)`, which also
 * maintains the version history: a snapshot is appended when the label
 * changes or two minutes have passed; otherwise the last entry is updated.
 */
export function withHistory(s: Story, fn: StoryUpdater, why?: string): Story {
  const next = fn({ ...s })
  const now = Date.now()
  const hist = [...(s.history || [])]
  const last = hist[hist.length - 1]
  const label =
    why ||
    (next.title !== s.title
      ? 'Title'
      : JSON.stringify(next.style) !== JSON.stringify(s.style)
        ? 'Restyled'
        : next.blocks !== s.blocks
          ? 'Writing'
          : 'Edit')
  const words = wordCount(next)
  if (
    !last ||
    now - last.t > 120000 ||
    last.label !== label ||
    why === 'Artifact updated' ||
    why === 'Text styled' ||
    why === 'Restored' ||
    why === 'Restyled'
  ) {
    hist.push({
      t: now,
      label,
      words,
      snap: JSON.stringify({
        title: s.title,
        blocks: s.blocks,
        style: s.style,
        chats: s.chats,
        notes: s.notes,
        presets: s.presets,
      }),
    })
  } else {
    hist[hist.length - 1] = { ...last, t: now, words }
  }
  next.history = hist.slice(-60)
  return next
}

export function useStories() {
  const [stories, setStories] = useState<Story[]>(load)
  const [ready, setReady] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedStories, setSavedStories] = useState<Story[] | null>(null)
  // A new snapshot is unsaved in its very first render, before effects run.
  const saving = !saveError && savedStories !== stories
  useEffect(() => {
    let active = true
    loadWorkspace(load())
      .then((saved) => {
        if (active && Array.isArray(saved)) setStories(saved.map(migrateStory))
      })
      .catch(() => {
        if (active) setSaveError('Local storage is unavailable. Export a backup before leaving.')
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    if (!ready) return
    let active = true
    const timer = setTimeout(() => {
      saveWorkspace(stories)
        .then(() => {
          if (active) {
            setSaveError('')
            setSavedStories(stories)
          }
        })
        .catch(() => {
          if (active) {
            setSaveError('Your latest changes could not be saved. Export a backup before leaving.')
          }
        })
    }, 150)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [stories, ready])

  const upStory = useCallback((id: string, fn: StoryUpdater, why?: string) => {
    setStories((arr) => arr.map((s) => (s.id === id ? withHistory(s, fn, why) : s)))
  }, [])

  const upBlock = useCallback(
    (sid: string, bid: string, fn: (b: Block) => Block, why?: string) => {
      upStory(sid, (s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === bid ? fn({ ...b }) : b)) }), why)
    },
    [upStory],
  )

  return useMemo(
    () => ({ stories, setStories, upStory, upBlock, ready, saveError, saving }),
    [stories, upStory, upBlock, ready, saveError, saving],
  )
}

export function useHomeTheme(): [HomeThemeKey, (k: HomeThemeKey) => void] {
  const [theme, set] = useState<HomeThemeKey>(() => {
    try {
      const v = localStorage.getItem(STORAGE_HOME)
      if (v === 'blue' || v === 'paper' || v === 'night') return v
    } catch {
      /* ignore */
    }
    return 'blue'
  })
  const pick = useCallback((k: HomeThemeKey) => {
    try {
      localStorage.setItem(STORAGE_HOME, k)
    } catch {
      /* ignore */
    }
    set(k)
  }, [])
  return [theme, pick]
}
