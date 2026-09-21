import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from '../src/text/Markdown'
import { normalizeMarks, readTextDocument, textDocument, sliceMarks } from '../src/text/formatting'
import { mergeParagraph } from '../src/model/paragraphs'
import { backup, readBackup, storyText } from '../src/portable/backup'
import { publication } from '../src/portable/export'
import PublishedStory from '../src/portable/PublishedStory'
import { example } from './storyFixture'

describe('author formatting', () => {
  it('preserves literal punctuation, unicode, newlines and overlapping marks', () => {
    const text = 'A 🌊 **literal**\nitalic'
    const marks = [
      { from: 0, to: text.length, kind: 'bold' as const },
      { from: 3, to: 8, kind: 'italic' as const },
    ]
    expect(readTextDocument(textDocument(text, marks))).toEqual({
      text,
      marks: normalizeMarks(text, marks),
    })
    expect(sliceMarks(marks, 3, 8)).toEqual([
      { from: 0, to: 5, kind: 'bold' },
      { from: 0, to: 5, kind: 'italic' },
    ])
  })
  it('retains styles through merge, backup, publication and plain copy; keeps notes private', () => {
    const s = example()
    s.formatting = {
      a: [{ from: 0, to: 5, kind: 'bold' }],
      b: [{ from: 0, to: 6, kind: 'italic' }],
      'n-b': [{ from: 0, to: 7, kind: 'underline' }],
    }
    const merged = mergeParagraph(s, 'b')!.story
    expect(merged.formatting?.a).toEqual([
      { from: 0, to: 5, kind: 'bold' },
      { from: 16, to: 22, kind: 'italic' },
    ])
    expect(merged.formatting?.['n-a']).toEqual([{ from: 20, to: 27, kind: 'underline' }])
    expect(readBackup(backup(merged)).formatting).toEqual(merged.formatting)
    expect(storyText(merged)).toContain('First paragraph.Second paragraph.')
    const p = publication(merged)
    expect(p.formatting?.['n-a']).toBeUndefined()
    const html = renderToStaticMarkup(<PublishedStory story={p} />)
    expect(html).toContain('<strong>First</strong>')
    expect(html).toContain('<em>Second</em>')
    expect(html).not.toContain('PRIVATE FIRST NOTE')
  })
})
it('renders chat Markdown without executing HTML, unsafe links or loading images', () => {
  const html = renderToStaticMarkup(
    <Markdown>
      {
        '### Heading\n\n**Bold** and *italic*, `code`.\n\n- One\n- Two\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1)) ![reference](https://example.com/track.png)'
      }
    </Markdown>,
  )
  expect(html).toContain('<strong>Bold</strong>')
  expect(html).toContain('<em>italic</em>')
  expect(html).toContain('<h3>Heading</h3>')
  expect(html).toContain('<li>One</li>')
  expect(html).not.toMatch(/<script|javascript:|<img/)
})
