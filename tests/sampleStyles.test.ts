import { describe, expect, it } from 'vitest'
import { DEF_STYLE, THUMBS } from '../src/model/constants'
import { migrateStory } from '../src/model/migrate'
import { blankStory, seed } from '../src/model/seed'
import { sampleStyle } from '../src/model/sampleStyles'
import { withHistory } from '../src/model/store'

describe('sample covers and writing pages share their appearance', () => {
  it('uses the existing preview colors, including white-on-dark alphabet', () => {
    for (const story of seed().filter((s) => s.id !== 's-whales')) {
      expect(story.style.ink).toBe(THUMBS[story.thumb].ink)
      if (story.id !== 's-colors') expect(story.style.bg).toBe(THUMBS[story.thumb].bg)
    }
    expect(sampleStyle('s-night')).toMatchObject({ bg: '#2a2622', ink: '#f4efe4' })
    expect(blankStory().style).toEqual(DEF_STYLE)
  })

  it('uses a portable full-page tide gradient without invalid color values', () => {
    const tide = sampleStyle('s-colors')!
    expect(tide).toMatchObject({
      bg: '#98ad9a',
      backdrop: 'gradient',
      paper: 'full',
      backgroundFrom: '#e9cdb8',
      backgroundVia: '#bec4ad',
      backgroundTo: '#98ad9a',
      backgroundAngle: 180,
    })
    expect(tide.backdropSrc).toBeNull()
    expect(sampleStyle('unknown')).toBeUndefined()
    tide.ink = '#ffffff'
    expect(sampleStyle('s-colors')!.ink).toBe('#2a2622')
  })

  it('upgrades only the original sample appearance while preserving edited content and history', () => {
    const story = seed().find((s) => s.id === 's-colors')!
    delete story.sampleStyleVersion
    story.style = { ...DEF_STYLE }
    story.title = 'My tide edits'
    story.blocks = [{ id: 'my-text', type: 'text', text: 'An edited paragraph.' }]
    story.notes = { 'my-text': 'A note to keep.' }
    story.chats = { 'my-text': [{ me: true, text: 'An earlier conversation.' }] }
    story.files = ['my-data.csv']
    story.presets = [{ id: 'mine', name: 'Mine', style: { ...DEF_STYLE, size: 20 } }]
    story.history = [{ t: 1, label: 'Writing', words: 3, snap: JSON.stringify({ style: story.style }) }]
    const migrated = migrateStory(story)
    expect(migrated.style).toEqual(sampleStyle('s-colors'))
    expect({ ...migrated, style: story.style }).toEqual({ ...story, sampleStyleVersion: 2 })
    expect(story.style).toEqual(DEF_STYLE)
    expect(migrateStory(migrated)).toEqual(migrated)
  })

  it('also recognizes the brown ink of the first release', () => {
    const story = seed().find((s) => s.id === 's-night')!
    delete story.sampleStyleVersion
    story.style = { ...DEF_STYLE, ink: '#2a2622' }
    expect(migrateStory(story).style).toEqual(sampleStyle('s-night'))
  })

  it('does not replace custom styles, an explicit reset, other stories, or changed sample identities', () => {
    const story = seed().find((s) => s.id === 's-colors')!
    delete story.sampleStyleVersion
    const customized = [
      { ...story, style: { ...DEF_STYLE, size: 20 } },
      { ...story, style: { ...DEF_STYLE, bg: '#ffffff' } },
      { ...story, style: { ...DEF_STYLE, imageModel: 'gpt-image-2.5-flare' as const } },
      {
        ...story,
        style: { ...DEF_STYLE },
        history: [{ t: 1, label: 'Restyled', words: 0, snap: '{}' }],
      },
      { ...story, id: 'my-copy', style: { ...DEF_STYLE } },
      { ...story, thumb: 'lines' as const, style: { ...DEF_STYLE } },
    ]
    for (const example of customized) {
      const migrated = migrateStory(example)
      expect(migrated.style).toEqual(example.style)
      expect(migrated.sampleStyleVersion).toBe(example.id === 'my-copy' ? undefined : 2)
    }
  })

  it('remembers evaluation after style history ages out and when restoring an old snapshot', () => {
    let story = seed().find((s) => s.id === 's-colors')!
    delete story.sampleStyleVersion
    story.style = { ...DEF_STYLE, size: 20 }
    story = migrateStory(story)
    expect(story.sampleStyleVersion).toBe(2)
    expect(story.style.size).toBe(20)
    story = withHistory(story, (s) => ({ ...s, style: { ...DEF_STYLE } }), 'Restyled')
    for (let i = 0; i < 65; i++)
      story = withHistory(story, (s) => ({ ...s, title: `Draft ${i}` }), `Edit ${i}`)
    expect(story.history?.some((v) => v.label === 'Restyled')).toBe(false)
    expect(migrateStory(story).style).toEqual(DEF_STYLE)

    // Write.restoreVersion overlays the historical snapshot on the current
    // story; old snapshots have no marker, so the current one remains intact.
    const oldSnapshot = { style: { ...DEF_STYLE }, title: 'Earlier title' }
    const restored = migrateStory({ ...story, ...oldSnapshot })
    expect(restored.style).toEqual(DEF_STYLE)
    expect(restored.sampleStyleVersion).toBe(2)
  })

  it('makes only the exact earlier Tide SVG editable as a gradient, preserving other style changes', () => {
    const legacySvg =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tide" x2="0" y2="1"><stop stop-color="#e9cdb8"/><stop offset=".7" stop-color="#98ad9a"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#tide)"/></svg>',
      )
    const story = seed().find((s) => s.id === 's-colors')!
    story.sampleStyleVersion = 1
    story.style = { ...DEF_STYLE, bg: '#98ad9a', size: 22, backdrop: 'image', backdropSrc: legacySvg }
    const upgraded = migrateStory(story)
    expect(upgraded.style).toMatchObject({ backdrop: 'gradient', size: 22, backdropSrc: null })
    expect(upgraded.sampleStyleVersion).toBe(2)
    expect(migrateStory(upgraded)).toEqual(upgraded)
    story.style.backdropSrc = 'data:image/png;base64,mine'
    expect(migrateStory(story).style).toEqual(story.style)
  })
})
