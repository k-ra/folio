import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { parseData } from '../src/magic/data'
import { previewProvider } from '../src/magic/provider'
import { whaleStory } from '../src/model/samples/whales'
import StorySources from '../src/write/StorySources'
import csv from '../src/model/samples/right-whale-abundance.csv?raw'
import csvUrl from '../src/model/samples/right-whale-abundance.csv?url'

describe('real-data whale sample', () => {
  it('charts all 35 published medians with years rather than research row IDs', () => {
    const parsed = parseData(csv, 'Median')
    expect(parsed.xLabel).toBe('Year')
    expect(parsed.yLabel).toBe('Median')
    expect(parsed.points.map((p) => p.label)).toEqual(Array.from({ length: 35 }, (_, i) => String(1990 + i)))
    expect(parsed.points[0]).toEqual({ label: '1990', value: 289 })
    expect(parsed.points[21]).toEqual({ label: '2011', value: 483 })
    expect(parsed.points[34]).toEqual({ label: '2024', value: 384 })
    expect(parseData(csv, 'Lower95').points[34].value).toBe(375)
    expect(parseData(csv, 'Upper95').points[34].value).toBe(394)
  })

  it('keeps the complete original CSV attached to an editable, attributed artifact', () => {
    const story = whaleStory()
    const block = story.blocks.find((b) => b.type === 'magic')!
    expect(story.id).toBe('s-whales')
    expect(story.title).toBe('Listening before translating')
    expect(block).toMatchObject({ mode: 'data', status: 'done', revision: 0 })
    expect(block.attachments).toEqual([
      {
        id: 'whales-csv',
        name: 'right-whale-abundance.csv',
        kind: 'data',
        content: csv,
      },
    ])
    expect(block.revisions[0].sourceNames).toEqual(['right-whale-abundance.csv'])
    expect(block.revisions[0].output).toMatchObject({
      kind: 'chart',
      points: parseData(csv, 'Median').points,
      xLabel: 'Year',
    })
    expect(block.revisions[0].output.demo).not.toBe(true)
    expect(story.sources).toHaveLength(5)
    expect(story.sources).toContainEqual({
      label: 'Download original CSV',
      url: csvUrl,
    })
    expect(story.sources?.find((s) => s.label.includes('NOAA'))?.url).toBe(
      'https://repository.library.noaa.gov/view/noaa/72014',
    )
  })

  it('creates independent editable samples and makes species and uncertainty explicit', () => {
    const a = whaleStory()
    const b = whaleStory()
    a.style.ink = '#ffffff'
    a.sources!.pop()
    const chart = a.blocks.find((block) => block.type === 'magic')!
    chart.attachments[0].content = 'changed'
    expect(b.style.ink).not.toBe(a.style.ink)
    expect(b.sources).toHaveLength(5)
    expect(b.blocks.find((block) => block.type === 'magic')!.attachments[0].content).toBe(csv)
    const text = b.blocks.flatMap((block) => (block.type === 'text' ? block.text : [])).join(' ')
    expect(text).toContain('845,000 sperm whales')
    expect(text).toContain('not a count of all the world’s whales')
    expect(text).toContain('right whales, not CETI’s sperm whales')
    expect(text).toContain('95% credible interval of 375–394')
  })

  it('keeps the median series when workshopping the chart in chat', async () => {
    vi.useFakeTimers()
    try {
      const story = whaleStory()
      const block = story.blocks.find((b) => b.type === 'magic')!
      const result = previewProvider.generate(
        {
          mode: 'data',
          instruction: 'Make this a bar chart',
          originalPrompt: block.prompt,
          attachments: block.attachments,
          previous: block.revisions[0].output,
          history: [block.prompt],
          style: story.style,
        },
        new AbortController().signal,
      )
      await vi.advanceTimersByTimeAsync(1800)
      expect(await result).toMatchObject({
        kind: 'chart',
        chartStyle: 'bar',
        yLabel: 'Median',
        points: parseData(csv, 'Median').points,
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps source notes collapsed and exposes the original CSV for download', () => {
    const { container, rerender } = render(createElement(StorySources, { sources: whaleStory().sources }))
    expect(screen.getByText('Source notes')).toBeTruthy()
    expect(container.querySelector('details')?.open).toBe(false)
    const csvLink = screen.getByText('Download original CSV')
    expect(csvLink.getAttribute('href')).toBe(csvUrl)
    expect(csvLink.hasAttribute('download')).toBe(true)
    rerender(createElement(StorySources, { sources: [] }))
    expect(container.innerHTML).toBe('')
  })
})
