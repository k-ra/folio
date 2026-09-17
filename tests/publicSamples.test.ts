import { describe, expect, it } from 'vitest'
import { seed, blankStory } from '../src/model/seed'
import { DEFAULT_FILES } from '../src/model/constants'

describe('public starter workspace', () => {
  it('ships only the neutral demonstrations and sourced data essay', () => {
    const stories = seed()
    expect(stories.map((s) => s.title)).toEqual([
      'Listening before translating',
      'Keep a notebook',
      'Patterns in a week',
      'A study in color',
      'After the lights dim',
      'A small field guide',
    ])
    expect(stories.every((s) => !s.history?.length && Object.keys(s.chats).length === 0)).toBe(true)
    expect(DEFAULT_FILES).toEqual([])
  })

  it('starts personal stories empty and independent of demo content', () => {
    const story = blankStory()
    expect(story.title).toBe('')
    expect(story.blocks).toHaveLength(1)
    expect(story.blocks[0]).toMatchObject({ type: 'text', text: '' })
    expect(story.notes).toEqual({})
  })
})
