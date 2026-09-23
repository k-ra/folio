import { beforeEach, describe, expect, it } from 'vitest'
import { example } from './storyFixture'
import { indexFromMarkdown, emptyIndex } from '../src/text/indexDocument'
import { withBrowserIndex } from '../src/model/indexClippings'
import { backup, readBackup, storyText } from '../src/portable/backup'
import { exportHtml } from '../src/portable/export'
import { withHistory } from '../src/model/store'

beforeEach(() => localStorage.clear())
describe('private story Index persistence', () => {
  it('round-trips rich clippings in backups, excludes them from publication and essay history', () => {
    const index = indexFromMarkdown(
      '## PRIVATE INDEX\n\n**Bold** and *italic*. [Source](https://example.com)\n\n- a list\n\n| A | B |\n| --- | --- |\n| 1 | 2 |',
    )
    const story = withHistory(example(), (s) => ({ ...s, index }))
    expect(story.history).toEqual(example().history)
    expect(readBackup(backup(story)).index).toEqual(index)
    expect(storyText(story)).not.toContain('PRIVATE INDEX')
    expect(exportHtml(story, true)).not.toContain('PRIVATE INDEX')
    expect(exportHtml(story)).not.toContain('PRIVATE INDEX')
  })
  it('migrates each earlier format only in its own workspace, leaving originals untouched', () => {
    const story = example(),
      id = story.id
    localStorage.setItem(
      `folio.index-study.v2:browser:${id}`,
      JSON.stringify([{ excerpt: 'Literal **stars**' }]),
    )
    expect(JSON.stringify(withBrowserIndex(story, localStorage).index)).toContain('Literal **stars**')
    localStorage.setItem(`folio.index-study.v3:browser:${id}`, '**Earlier words**')
    expect(withBrowserIndex(story, localStorage).index).toEqual(indexFromMarkdown('**Earlier words**'))
    const rich = indexFromMarkdown('## Rich words')
    const key = `folio.index-study.v4:browser:${id}`
    localStorage.setItem(key, JSON.stringify(rich))
    const migrated = withBrowserIndex(story, localStorage)
    expect(migrated.index).toEqual(rich)
    expect(withBrowserIndex(migrated, localStorage)).toBe(migrated)
    expect(localStorage.getItem(key)).toBe(JSON.stringify(rich))
    expect(withBrowserIndex(story, localStorage, 'account-a').index).toBeUndefined()
    localStorage.setItem(`folio.index-study.v3:account-a:${id}`, 'Account A only')
    expect(withBrowserIndex(story, localStorage, 'account-a').index).toEqual(
      indexFromMarkdown('Account A only'),
    )
    expect(withBrowserIndex(story, localStorage, 'account-b').index).toBeUndefined()
  })
  it('never replaces a shared or deliberately emptied Index, and rejects corrupt legacy data', () => {
    const story = { ...example(), index: emptyIndex() }
    const key = `folio.index-study.v4:browser:${story.id}`
    localStorage.setItem(key, '{broken')
    expect(withBrowserIndex(story, localStorage)).toBe(story)
    expect(() => withBrowserIndex(example(), localStorage)).toThrow()
    expect(localStorage.getItem(key)).toBe('{broken')
  })
  it('allows only rich prose nodes and excludes credential metadata', () => {
    const index = { ...indexFromMarkdown('Safe text'), apiKey: 'PRIVATE KEY' }
    const encoded = backup({ ...example(), index })
    expect(encoded).not.toContain('PRIVATE KEY')
    expect(() =>
      backup({ ...example(), index: { type: 'doc', content: [{ type: 'script', text: 'alert(1)' }] } }),
    ).toThrow()
    expect(() =>
      backup({
        ...example(),
        index: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Bad',
                  marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
                },
              ],
            },
          ],
        },
      }),
    ).toThrow()
  })
})
