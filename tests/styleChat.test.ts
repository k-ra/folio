import { describe, expect, it } from 'vitest'
import { DEF_STYLE } from '../src/model/constants'
import {
  STYLE_CATEGORIES,
  styleResultPatch,
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
  it('only changes the requested category and keeps a bounded shared conversation', () => {
    for (const category of STYLE_CATEGORIES) {
      const patch = styleResultPatch(DEF_STYLE, category, 'Make it calmer', result)
      expect(patch).not.toHaveProperty('bodyFont')
      expect(patch).not.toHaveProperty('paper')
      expect(patch.customStyles?.[category]?.history).toEqual([
        { me: true, text: 'Make it calmer' },
        { me: false, text: result.reply },
      ])
      if (category !== 'palette') expect(patch).not.toHaveProperty('ink')
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
    expect(validStyleResult({ ...result, css: '' }, 'page')).toBe(false)
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
