import { useState } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DEF_STYLE } from '../src/model/constants'
import type { ArtifactOutput, MagicBlock, Story } from '../src/model/types'
import { currentRevision, hasUnsentInstruction, marginInstruction, newMagicBlock } from '../src/magic/state'
import { useMagic } from '../src/magic/useMagic'
import type { ArtifactProvider } from '../src/magic/provider'
import { parseData } from '../src/magic/data'
import { migrateStory } from '../src/model/migrate'
import { sandboxDocument } from '../src/magic/ArtifactView'
import { sourceCaption } from '../src/magic/source'

const output = (caption: string): ArtifactOutput => ({
  kind: 'html',
  html: '<p>' + caption + '</p>',
  caption,
})
const initial = (): Story => ({
  id: 'test',
  title: 'A study',
  date: 'TODAY',
  thumb: 'lines',
  style: DEF_STYLE,
  blocks: [{ ...newMagicBlock('a'), prompt: 'Draw a curve' }, newMagicBlock('b')],
  notes: {},
  chats: {},
})
function mount(provider: ArtifactProvider) {
  return renderHook(() => {
    const [story, setStory] = useState(initial)
    const [opened, setOpened] = useState('')
    const magic = useMagic(story, DEF_STYLE, (fn) => setStory(fn), setOpened, provider)
    return { story, setStory, magic, opened, block: story.blocks[0] as MagicBlock }
  })
}
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ configured: false }) }))
})

describe('the margin and chat share one artifact edit stream', () => {
  it('keeps width independent of generation, artifact undo, reload and later edits', async () => {
    const provider = { generate: vi.fn(async (r) => output(r.instruction)) } satisfies ArtifactProvider
    const { result } = mount(provider)
    act(() => result.current.magic.setLayout('a', 'full-bleed'))
    expect(provider.generate).not.toHaveBeenCalled()
    await act(async () => {
      await result.current.magic.generate('a')
    })
    expect(provider.generate.mock.calls[0][0].layout).toBe('full-bleed')
    await act(async () => {
      await result.current.magic.generate('a', 'Second edit')
    })
    const revisions = result.current.block.revisions
    const chats = result.current.story.chats
    act(() => result.current.magic.setLayout('a', 'column'))
    expect(result.current.block.revisions).toBe(revisions)
    expect(result.current.story.chats).toBe(chats)
    act(() => result.current.magic.restore('a', 0))
    expect(result.current.block.layout).toBe('column')
    act(() => result.current.magic.setLayout('a', 'full-bleed'))
    const saved = migrateStory(JSON.parse(JSON.stringify(result.current.story)))
    expect((saved.blocks[0] as MagicBlock).layout).toBe('full-bleed')
    expect(result.current.story.blocks[1]).toEqual(initial().blocks[1])
  })
  it('only offers sending when the instruction differs from the selected artifact', async () => {
    const { result } = mount({ generate: async (r) => output(r.instruction) })
    await act(async () => {
      await result.current.magic.generate('a')
    })
    expect(hasUnsentInstruction(result.current.block)).toBe(false)
    act(() => result.current.magic.setEdit('a', '  Draw a curve  '))
    expect(hasUnsentInstruction(result.current.block)).toBe(false)
    act(() => result.current.magic.setEdit('a', 'Make it blue'))
    expect(hasUnsentInstruction(result.current.block)).toBe(true)
    await act(async () => {
      await result.current.magic.generate('a', undefined, true)
    })
    expect(hasUnsentInstruction(result.current.block)).toBe(false)
    act(() => result.current.magic.restore('a', 0))
    expect(hasUnsentInstruction(result.current.block)).toBe(false)
  })
  it('validates simultaneous attachment batches against the final state', () => {
    const { result } = mount({ generate: async () => output('unused') })
    const file = { id: 'file', name: 'a.csv', kind: 'data' as const, content: 'a,b\n1,2' }
    act(() => {
      result.current.magic.attach('a', [file, file, file])
      result.current.magic.attach('a', [file, file])
    })
    expect(result.current.block.attachments).toHaveLength(3)
    expect(result.current.block.error).toContain('four')
  })
  it('keeps the source caption with its output when attachments change or a revision is restored', async () => {
    const { result } = mount({ generate: async (r) => output(r.instruction) })
    act(() =>
      result.current.magic.attach('a', [
        { id: 'source-a', name: 'first.csv', kind: 'data', content: 'Day,Value\nMon,12' },
      ]),
    )
    await act(async () => {
      await result.current.magic.generate('a')
    })
    expect(sourceCaption(result.current.block)).toBe('Generated graphic · first.csv')
    act(() => result.current.magic.detach('a', 'source-a'))
    expect(sourceCaption(result.current.block)).toBe('Generated graphic · first.csv')
    await act(async () => {
      await result.current.magic.generate('a', 'Without a reference')
    })
    expect(sourceCaption(result.current.block)).toBe('Generated graphic · from your prompt')
    act(() => result.current.magic.restore('a', 0))
    expect(sourceCaption(result.current.block)).toBe('Generated graphic · first.csv')
  })
  it('keeps the most recent chat edit in the margin after several rounds, including reload', async () => {
    const provider: ArtifactProvider = { generate: vi.fn(async (r) => output(r.instruction)) }
    const { result } = mount(provider)
    await act(async () => {
      await result.current.magic.generate('a')
    })
    act(() => result.current.magic.setEdit('a', 'Make the curve thinner'))
    await act(async () => {
      await result.current.magic.generate('a', undefined, true)
    })
    expect(result.current.opened).toBe('a')
    for (const instruction of ['Make it a circle', 'Add three labels', 'Use a dotted outline']) {
      await act(async () => {
        await result.current.magic.generate('a', instruction)
      })
      expect(marginInstruction(result.current.block)).toBe(instruction)
      expect(currentRevision(result.current.block)?.output.caption).toBe(instruction)
    }
    const restored = migrateStory(JSON.parse(JSON.stringify(result.current.story)))
    expect(marginInstruction(restored.blocks[0] as MagicBlock)).toBe('Use a dotted outline')
    expect(result.current.story.chats.a.filter((m) => m.me).map((m) => m.text)).toEqual([
      'Draw a curve',
      'Make the curve thinner',
      'Make it a circle',
      'Add three labels',
      'Use a dotted outline',
    ])
    expect(result.current.story.chats.b).toBeUndefined()
    expect(result.current.story.blocks[1]).toEqual(initial().blocks[1])
    const lastRequest = vi.mocked(provider.generate).mock.calls.at(-1)![0]
    expect(lastRequest.history).toContain('Make the curve thinner')
    expect(lastRequest.previous?.caption).toBe('Add three labels')
  })
  it('undo and redo restore both the image and the instruction; a new edit branches from the restored version', async () => {
    const { result } = mount({ generate: async (r) => output(r.instruction) })
    await act(async () => {
      await result.current.magic.generate('a')
    })
    await act(async () => {
      await result.current.magic.generate('a', 'Second edit')
    })
    act(() => result.current.magic.restore('a', 0))
    expect(marginInstruction(result.current.block)).toBe('Draw a curve')
    expect(currentRevision(result.current.block)?.output.caption).toBe('Draw a curve')
    act(() => result.current.magic.restore('a', 1))
    expect(marginInstruction(result.current.block)).toBe('Second edit')
    act(() => result.current.magic.restore('a', 0))
    await act(async () => {
      await result.current.magic.generate('a', 'New direction')
    })
    expect(result.current.block.revisions.map((r) => r.instruction)).toEqual([
      'Draw a curve',
      'New direction',
    ])
  })
  it('preserves the last good output and the unsent instruction when a request fails', async () => {
    const provider = {
      generate: vi.fn().mockResolvedValueOnce(output('Original')).mockRejectedValueOnce(new Error('Offline')),
    }
    const { result } = mount(provider)
    await act(async () => {
      await result.current.magic.generate('a')
    })
    await act(async () => {
      await result.current.magic.generate('a', 'Please change it')
    })
    expect(result.current.block.status).toBe('error')
    expect(currentRevision(result.current.block)?.output.caption).toBe('Original')
    expect(marginInstruction(result.current.block)).toBe('Please change it')
    expect(result.current.story.chats.a.filter((m) => m.me)).toHaveLength(1)
  })
  it('ignores a late result after cancel and allows an immediate fresh request', async () => {
    let finish!: (o: ArtifactOutput) => void
    const provider = {
      generate: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((r) => {
              finish = r
            }),
        )
        .mockResolvedValueOnce(output('Fresh')),
    }
    const { result } = mount(provider)
    let pending!: Promise<void>
    act(() => {
      pending = result.current.magic.generate('a')
    })
    act(() => result.current.magic.cancel('a'))
    await act(async () => {
      await result.current.magic.generate('a', 'Fresh')
    })
    await act(async () => {
      finish(output('Stale'))
      await pending
    })
    expect(currentRevision(result.current.block)?.output.caption).toBe('Fresh')
    expect(result.current.block.revisions).toHaveLength(1)
  })
  it('does not recreate an artifact that was deleted while generating', async () => {
    let finish!: (o: ArtifactOutput) => void
    const { result } = mount({
      generate: () =>
        new Promise((r) => {
          finish = r
        }),
    })
    let pending!: Promise<void>
    act(() => {
      pending = result.current.magic.generate('a')
    })
    act(() => result.current.setStory((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== 'a') })))
    await act(async () => {
      finish(output('Late'))
      await pending
    })
    expect(result.current.story.blocks.some((b) => b.id === 'a')).toBe(false)
    expect(result.current.story.chats.a).toBeUndefined()
  })
  it('deduplicates double sends', async () => {
    const provider = { generate: vi.fn(async () => output('Once')) }
    const { result } = mount(provider)
    await act(async () => {
      await Promise.all([result.current.magic.generate('a'), result.current.magic.generate('a')])
    })
    expect(provider.generate).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(result.current.block.revisions).toHaveLength(1))
  })
})

describe('real data and safe artifact boundaries', () => {
  it('parses quoted commas, missing values, CRLF, and negative numbers without inventing values', () => {
    expect(parseData('Month,Value\r\n"Jan, early",12\r\nFeb,\r\nMar,-4').points).toEqual([
      { label: 'Jan, early', value: 12 },
      { label: 'Mar', value: -4 },
    ])
  })
  it('uses a named numeric column and supports TSV', () => {
    expect(
      parseData('Day\tSales\tCost\nMon\t40\t12\nTue\t30\t8', 'plot Cost').points.map((p) => p.value),
    ).toEqual([12, 8])
  })
  it('ignores research row IDs and treats numeric years as labels rather than measures', () => {
    const csv = '"",Year,Lower95,Median,Upper95\n"N[1]",2024,375,384,394'
    expect(parseData(csv, 'Plot Median by Year')).toEqual({
      xLabel: 'Year',
      yLabel: 'Median',
      points: [{ label: '2024', value: 384 }],
    })
    expect(parseData(csv, 'Label every Year', 'Median').yLabel).toBe('Median')
  })
  it('rejects unclosed quotes and files without a numeric series', () => {
    expect(() => parseData('Day,Value\n"a,2')).toThrow('unclosed quote')
    expect(() => parseData('Day,Value\nMon,no')).toThrow('numeric column')
  })
  it('puts the restrictive CSP before any generated content', () => {
    const html = sandboxDocument('<script>fetch("https://example.com")</script>')
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<script>'))
    expect(html).toContain("connect-src 'none'")
    expect(html).toContain("form-action 'none'")
  })
  it('migrates an old graphic without losing its prompt, notes, chat, or original object', () => {
    const s = initial()
    s.blocks = [
      {
        id: 'old',
        type: 'graphic',
        prompt: 'Pain by day',
        status: 'done',
        data: ['measurements.csv'],
        caption: 'My chart',
        hatch: true,
        thin: true,
      },
    ]
    s.notes.old = 'Keep this note'
    s.chats.old = [{ me: true, text: 'Make it thin' }]
    const saved = JSON.stringify(s),
      migrated = migrateStory(s)
    expect(migrated.blocks[0].type).toBe('magic')
    expect(migrated.notes.old).toBe('Keep this note')
    expect(migrated.chats.old[0].text).toBe('Make it thin')
    expect(JSON.stringify(s)).toBe(saved)
  })
})
