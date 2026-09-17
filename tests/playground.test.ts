import { describe, expect, it } from 'vitest'
import { introduceMockEssay, mockEssay } from '../src/model/samples/mockEssay'
import { whaleStory } from '../src/model/samples/whales'
import { FOLIO_STYLE } from '../src/style/presets'
import { sampleStyle } from '../src/model/sampleStyles'

describe('essay playground fixture', () => {
  it('adds the essay to an existing workspace once without replacing other stories', () => {
    const existing = { ...whaleStory(), id: 'my-story', title: 'My own essay' }
    const next = introduceMockEssay([existing])
    expect(next[0].id).toBe('s-whales')
    expect(next[1]).toBe(existing)
    expect(introduceMockEssay(next)).toEqual(next)
  })

  it('preserves edited whale stories and enriches only the untouched old sample', () => {
    const edited = whaleStory()
    edited.title = 'My research'
    edited.notes = { 'whales-listening': 'Do not lose this note.' }
    expect(introduceMockEssay([edited])[0]).toBe(edited)
    const old = whaleStory()
    old.style.bg = '#abcdef'
    old.notes['whales-language'] = 'My existing note'
    const updated = introduceMockEssay([old])[0]
    expect(updated.blocks.some((b) => b.id === 'whales-rhythm')).toBe(true)
    expect(updated.style.bg).toBe('#abcdef')
    expect(updated.notes['whales-language']).toBe('My existing note')
  })

  it('uses the sourced whale essay with prose, a draft, a finished chart and an editorial note', () => {
    const story = mockEssay()
    expect(story.title).toBe('Listening before translating')
    expect(story.blocks.filter((b) => b.type === 'text')).toEqual(
      whaleStory().blocks.filter((b) => b.type === 'text'),
    )
    expect(story.blocks.find((b) => b.id === 'whales-rhythm')).toMatchObject({
      type: 'magic',
      mode: 'graphics',
      status: 'prompt',
      revisions: [],
    })
    expect(story.blocks.find((b) => b.id === 'whales-abundance')).toMatchObject({
      type: 'magic',
      mode: 'data',
      status: 'done',
    })
    expect(story.notes['whales-language']).toContain('finding a pattern')
    expect(story.sources).toEqual(whaleStory().sources)
    expect(story.style).toEqual(FOLIO_STYLE)
  })

  it('restyles the whole initial essay, including its starting artifact revision', () => {
    const paper = sampleStyle('s-colors')!
    const story = mockEssay(paper)
    expect(story.style).toEqual(paper)
    const chart = story.blocks.find((b) => b.id === 'whales-abundance')!
    expect(chart.type === 'magic' && chart.revisions[0].style).toEqual(paper)
  })

  it('reset creates independent content without changing the saved-story seed or presets', () => {
    const a = mockEssay()
    const pristine = mockEssay()
    a.style.ink = '#abcdef'
    a.notes['whales-language'] = 'Changed note'
    a.sources!.pop()
    const chart = a.blocks.find((b) => b.id === 'whales-abundance')!
    if (chart.type === 'magic') chart.attachments[0].content = 'Changed CSV'
    expect(mockEssay()).toEqual(pristine)
    expect(whaleStory().notes).toEqual({})
    expect(FOLIO_STYLE.ink).toBe('#111111')
  })
})
