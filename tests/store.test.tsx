import { useLayoutEffect } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { blankStory } from '../src/model/seed'
import { useStories } from '../src/model/store'
import { loadWorkspace, saveWorkspace } from '../src/model/storage'
import type { Story } from '../src/model/types'

vi.mock('../src/model/storage', () => ({ loadWorkspace: vi.fn(), saveWorkspace: vi.fn() }))

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  vi.mocked(loadWorkspace).mockReset().mockResolvedValue([blankStory()])
  vi.mocked(saveWorkspace).mockReset().mockResolvedValue()
})
afterEach(() => vi.useRealTimers())

async function advanceSave() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(150)
  })
}

async function mount() {
  const frames: { stories: Story[]; saving: boolean }[] = []
  const hook = renderHook(() => {
    const workspace = useStories()
    // Observe the committed UI before passive effects can change its save status.
    useLayoutEffect(() => {
      frames.push({ stories: workspace.stories, saving: workspace.saving })
    })
    return workspace
  })
  await act(async () => {})
  await advanceSave()
  expect(hook.result.current.saving).toBe(false)
  return { ...hook, frames }
}

it('never labels an edited or restored snapshot saved before its storage transaction finishes', async () => {
  const { result, frames } = await mount()
  const pending = deferred()
  vi.mocked(saveWorkspace).mockImplementationOnce(() => pending.promise)
  frames.length = 0
  act(() => {
    result.current.upStory(
      result.current.stories[0].id,
      (s) => ({ ...s, title: 'Restored title' }),
      'Restored',
    )
  })
  expect(frames.length).toBeGreaterThan(0)
  expect(frames.every((frame) => frame.saving)).toBe(true)
  await advanceSave()
  expect(result.current.saving).toBe(true)
  expect(vi.mocked(saveWorkspace).mock.calls.at(-1)?.[0]).toBe(result.current.stories)
  await act(async () => pending.resolve())
  expect(result.current.saving).toBe(false)
})

it('an obsolete save completion cannot mark newer changes saved', async () => {
  const { result } = await mount()
  const first = deferred()
  const latest = deferred()
  vi.mocked(saveWorkspace)
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => latest.promise)
  const id = result.current.stories[0].id
  act(() => result.current.upStory(id, (s) => ({ ...s, title: 'First edit' })))
  await advanceSave()
  act(() => result.current.upStory(id, (s) => ({ ...s, title: 'Latest edit' })))
  await advanceSave()
  await act(async () => first.resolve())
  expect(result.current.saving).toBe(true)
  await act(async () => latest.resolve())
  expect(result.current.saving).toBe(false)
  expect(result.current.stories[0].title).toBe('Latest edit')
})

it('reports a failed save and clears the warning only after a successful later save', async () => {
  const { result } = await mount()
  const pending = deferred()
  vi.mocked(saveWorkspace).mockImplementationOnce(() => pending.promise)
  const id = result.current.stories[0].id
  act(() => result.current.upStory(id, (s) => ({ ...s, title: 'Keep this edit' })))
  await advanceSave()
  await act(async () => pending.reject(new Error('Storage is full')))
  expect(result.current.saveError).toContain('Export a backup')
  expect(result.current.saving).toBe(false)
  act(() => result.current.upStory(id, (s) => ({ ...s, title: 'Try again' })))
  expect(result.current.saveError).toContain('Export a backup')
  await advanceSave()
  expect(result.current.saveError).toBe('')
  expect(result.current.saving).toBe(false)
})
