import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DEF_STYLE } from '../src/model/constants'
import type { FancyBlock, Story } from '../src/model/types'
import {
  DEFAULT_FANCY,
  fancyStyle,
  validFancyRequest,
  validFancyResult,
  type FancyResult,
} from '../src/fancy/contract'
import { fancyInstruction, hasFancyDraft } from '../src/fancy/state'
import { useFancy, type FancyProvider } from '../src/fancy/useFancy'
import { fancyPayload } from '../server/fancyContract'
import { migrateStory } from '../src/model/migrate'

const initial = (): Story => ({
  id: 'fancy-test',
  title: 'Typography',
  date: 'TODAY',
  thumb: 'lines',
  style: DEF_STYLE,
  blocks: [
    {
      id: 'a',
      type: 'fancy',
      text: 'heyyyy',
      prompt: '',
      fancy: { size: 30, align: 'center', font: 'header', italic: false, pad: 30, ls: 0 },
    },
    { id: 'b', type: 'text', text: 'Do not change this paragraph.' },
  ],
  chats: {},
  notes: { a: 'Keep this note.' },
})
const resultFor = (motion: FancyResult['fancy']['motion']): FancyResult => ({
  fancy: { ...DEFAULT_FANCY, motion },
  reply: `Applied ${motion}.`,
})
function mount(provider: FancyProvider) {
  return renderHook(() => {
    const [story, setStory] = useState(initial)
    const [opened, open] = useState('')
    const fancy = useFancy(story, DEF_STYLE, setStory, open, provider)
    return { story, setStory, fancy, opened, block: story.blocks[0] as FancyBlock }
  })
}

describe('text styling contract', () => {
  it('supports old typography and renders only bounded known fields', () => {
    const old = initial().blocks[0] as FancyBlock
    expect(fancyStyle(old.fancy)).toMatchObject({
      size: 30,
      align: 'center',
      motion: 'none',
      color: 'inherit',
    })
    expect(
      fancyStyle({ ...old.fancy, size: Infinity, color: 'url(https://example.test)', motion: 'bad' as any }),
    ).toMatchObject({ size: 30, color: 'inherit', motion: 'none' })
    for (const change of [
      { size: 9000 },
      { duration: 0.1 },
      { color: 'red;position:fixed' },
      { html: '<script/>' },
      { motion: 'flash' },
    ]) {
      expect(validFancyResult({ ...resultFor('marquee'), fancy: { ...DEFAULT_FANCY, ...change } })).toBe(
        false,
      )
    }
    expect(validFancyResult({ ...resultFor('marquee'), text: 'replacement words' })).toBe(false)
  })
  it('sends current typography and conversation, not a keyword simulation or arbitrary CSS', () => {
    const request = {
      text: 'heyyyy',
      instruction: 'Make it a marquee',
      previous: DEFAULT_FANCY,
      history: [],
      style: DEF_STYLE,
    }
    expect(validFancyRequest(request)).toBe(true)
    expect(validFancyRequest({ ...request, text: '' })).toBe(false)
    expect(validFancyRequest({ ...request, instruction: 'x'.repeat(3001) })).toBe(false)
    const payload = fancyPayload(request)
    expect(payload.instructions).toContain('cannot rewrite the words')
    expect(payload.instructions).toContain('unsupported effect')
    expect(payload.text.format.schema.properties.fancy.additionalProperties).toBe(false)
    expect(payload.store).toBe(false)
  })
})

describe('one text styling conversation', () => {
  it('syncs margin and chat, preserves text and notes, and makes the first edit undoable', async () => {
    const provider = vi
      .fn<FancyProvider>()
      .mockResolvedValueOnce(resultFor('marquee'))
      .mockResolvedValueOnce(resultFor('float'))
    const { result } = mount(provider)
    act(() => result.current.fancy.setEdit('a', 'Make it a marquee'))
    expect(hasFancyDraft(result.current.block)).toBe(true)
    await act(async () => {
      await result.current.fancy.generate('a', undefined, true)
    })
    expect(result.current.opened).toBe('a')
    expect(fancyInstruction(result.current.block)).toBe('Make it a marquee')
    expect(hasFancyDraft(result.current.block)).toBe(false)
    await act(async () => {
      await result.current.fancy.generate('a', 'Float instead')
    })
    expect(provider.mock.calls[1][0].previous.motion).toBe('marquee')
    expect(provider.mock.calls[1][0].history.map((m) => m.text)).toEqual([
      'Make it a marquee',
      'Applied marquee.',
    ])
    expect(result.current.story.notes).toEqual(initial().notes)
    expect(result.current.story.blocks[1]).toEqual(initial().blocks[1])
    expect(result.current.block.text).toBe('heyyyy')
    act(() =>
      result.current.setStory((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.type === 'fancy' ? { ...b, text: 'new words' } : b)),
      })),
    )
    act(() => result.current.fancy.restore('a', 0))
    expect(result.current.block.fancy).toEqual((initial().blocks[0] as FancyBlock).fancy)
    expect(result.current.block.text).toBe('new words')
    act(() => result.current.fancy.restore('a', 2))
    expect(fancyInstruction(result.current.block)).toBe('Float instead')
    expect(result.current.block.fancy.motion).toBe('float')
    expect(
      (migrateStory(JSON.parse(JSON.stringify(result.current.story))).blocks[0] as FancyBlock).text,
    ).toBe('new words')
  })
  it('preserves the last good styling and instruction on failure; an undo branch drops only future styles', async () => {
    const provider = vi
      .fn<FancyProvider>()
      .mockResolvedValueOnce(resultFor('marquee'))
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(resultFor('reveal'))
    const { result } = mount(provider)
    await act(async () => {
      await result.current.fancy.generate('a', 'Move')
    })
    await act(async () => {
      await result.current.fancy.generate('a', 'Slow down')
    })
    expect(result.current.block.fancy.motion).toBe('marquee')
    expect(result.current.block.status).toBe('error')
    expect(fancyInstruction(result.current.block)).toBe('Slow down')
    expect(result.current.story.chats.a).toHaveLength(2)
    act(() => result.current.fancy.restore('a', 0))
    await act(async () => {
      await result.current.fancy.generate('a', 'Reveal')
    })
    expect(result.current.block.revisions?.map((r) => r.instruction)).toEqual(['', 'Reveal'])
  })
  it('deduplicates sends and ignores late output after cancel or deletion', async () => {
    let finish!: (r: FancyResult) => void
    const provider = vi
      .fn<FancyProvider>()
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            finish = r
          }),
      )
      .mockResolvedValue(resultFor('float'))
    const { result, unmount } = mount(provider)
    let pending!: Promise<void>
    act(() => {
      pending = result.current.fancy.generate('a', 'Move')
      void result.current.fancy.generate('a', 'Move')
    })
    expect(provider).toHaveBeenCalledTimes(1)
    act(() => result.current.fancy.cancel('a'))
    await act(async () => {
      await result.current.fancy.generate('a', 'Fresh')
    })
    await act(async () => {
      finish(resultFor('marquee'))
      await pending
    })
    expect(result.current.block.fancy.motion).toBe('float')
    provider.mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r
        }),
    )
    act(() => {
      pending = result.current.fancy.generate('a', 'Deleted')
    })
    act(() => result.current.setStory((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== 'a') })))
    await act(async () => {
      finish(resultFor('reveal'))
      await pending
    })
    expect(result.current.story.blocks.some((b) => b.id === 'a')).toBe(false)
    expect(result.current.story.chats.a).toHaveLength(2)
    unmount()
  })
  it('aborts an in-flight request when the editor unmounts', async () => {
    let finish!: (r: FancyResult) => void
    let signal!: AbortSignal
    const { result, unmount } = mount((_request, s) => {
      signal = s
      return new Promise((resolve) => {
        finish = resolve
      })
    })
    let pending!: Promise<void>
    act(() => {
      pending = result.current.fancy.generate('a', 'Move')
    })
    unmount()
    expect(signal.aborted).toBe(true)
    await act(async () => {
      finish(resultFor('marquee'))
      await pending
    })
  })
  it('recovers interrupted saved requests without losing the old style or draft', () => {
    const story = initial()
    Object.assign(story.blocks[0], { status: 'rendering', requestId: 'expired', editDraft: 'Keep this edit' })
    const recovered = migrateStory(story).blocks[0] as FancyBlock
    expect(recovered.status).toBe('idle')
    expect(recovered.requestId).toBeUndefined()
    expect(recovered.fancy).toEqual((initial().blocks[0] as FancyBlock).fancy)
    expect(fancyInstruction(recovered)).toBe('Keep this edit')
  })
})
