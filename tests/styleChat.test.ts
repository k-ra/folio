import { describe, expect, it } from 'vitest'
import { DEF_STYLE } from '../src/model/constants'
import { sameStyle } from '../src/style/presets'
import {
  STYLE_CATEGORIES,
  categoryStyle,
  styleResultPatch,
  styleContext,
  validStyleRequest,
  validStyleResult,
} from '../src/style/chatContract'

const result = {
  name: 'Reef study',
  direction: 'Radial marks with a time scrubber.',
  reply: 'A calmer radial study.',
  background: '#ffffff',
  ink: '#123456',
  css: 'body{background:#abcdef}',
  sample: '<svg></svg>',
}
describe('custom style boundaries', () => {
  it('continues legacy color conversations in Background without rewriting saved content', () => {
    const palette = {
      name: 'Blue paper', direction: 'Cool paper and blue ink',
      history: [{ me: true, text: 'Make the ink blue' }],
    }
    const style = { ...DEF_STYLE, customStyles: { palette } }
    expect(categoryStyle(style, 'page')).toBe(palette)
    expect(styleContext(style, 'page').direction).toBe(palette.direction)
    const patch = styleResultPatch(style, 'page', 'More light', result)
    expect(patch.bg).toBe(result.background)
    expect(patch.ink).toBe(result.ink)
    expect(patch.customStyles?.page?.history[0]).toEqual(palette.history[0])
    expect(patch.customStyles?.palette).toBe(palette)
    expect(categoryStyle({ ...style, ...patch }, 'page')?.name).toBe(result.name)
  })
  it('can replace an atmosphere with solid paper and ink in one background edit', () => {
    const patch = styleResultPatch(
      { ...DEF_STYLE, backdrop: 'custom', backgroundCode: 'body{background:red}' },
      'page', 'Plain white paper with blue ink', { ...result, css: '', sample: '' },
    )
    expect(patch).toMatchObject({ bg: '#ffffff', ink: '#123456', backdrop: 'none', backgroundCode: '' })
  })
  it('treats cleared optional fields as the original style after undo', () => {
    expect(sameStyle({ ...DEF_STYLE, customStyles: undefined, dataDirection: undefined }, DEF_STYLE)).toBe(
      true,
    )
    expect(sameStyle({ ...DEF_STYLE, dataDirection: 'Radial' }, DEF_STYLE)).toBe(false)
  })
  it('refines the selected preset, not dormant background code', () => {
    const style = {
      ...DEF_STYLE,
      backdrop: 'gradient' as const,
      backgroundFrom: '#123456',
      backgroundCode: 'body{background:red}',
      backgroundPrompt: 'Old red style',
    }
    const context = styleContext(style, 'page')
    expect(context.direction).toBe('gradient background')
    expect(context.css).toContain('linear-gradient')
    expect(context.css).toContain('#123456')
    expect(context.css).not.toContain('red')
    expect(styleContext({ ...style, backdrop: 'none' }, 'palette').css).toBe('')
    expect(styleContext({ ...DEF_STYLE, chartStyle: 'bar' }, 'data').direction).toContain('bar chart')
  })
  it('only changes the requested category and keeps a bounded shared conversation', () => {
    for (const category of STYLE_CATEGORIES) {
      const patch = styleResultPatch(DEF_STYLE, category, 'Make it calmer', result)
      expect(patch).not.toHaveProperty('bodyFont')
      expect(patch).not.toHaveProperty('paper')
      expect(patch.customStyles?.[category]?.history).toEqual([
        { me: true, text: 'Make it calmer' },
        { me: false, text: result.reply },
      ])
      if (category !== 'palette' && category !== 'page') expect(patch).not.toHaveProperty('ink')
      if (category !== 'page' && category !== 'palette') expect(patch).not.toHaveProperty('backgroundCode')
    }
    const prior = {
      ...DEF_STYLE,
      customStyles: {
        data: {
          name: 'Old',
          direction: '',
          history: Array.from({ length: 16 }, () => ({ me: true, text: 'Earlier' })),
        },
      },
    }
    expect(styleResultPatch(prior, 'data', 'Latest', result).customStyles?.data?.history).toHaveLength(16)
  })
  it('rejects incomplete studies and unbounded or malformed context', () => {
    expect(validStyleResult({ ...result, sample: '' }, 'data')).toBe(false)
    expect(validStyleResult({ ...result, css: '' }, 'page')).toBe(true)
    expect(validStyleResult({ ...result, ink: 'url(https://example.com)' }, 'palette')).toBe(false)
    const r = {
      category: 'data',
      instruction: 'A radial field',
      history: [],
      current: { direction: '', background: '#ffffff', ink: '#111111', css: '' },
    }
    expect(validStyleRequest(r)).toBe(true)
    expect(validStyleRequest({ ...r, instruction: 'x'.repeat(3001) })).toBe(false)
    expect(validStyleRequest({ ...r, category: '__proto__' })).toBe(false)
    expect(validStyleRequest({ ...r, history: [{ me: false, text: {} }] })).toBe(false)
  })
})
