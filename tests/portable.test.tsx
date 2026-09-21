import { describe, it, expect } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { example } from './storyFixture'
import { backup, readBackup, storyText } from '../src/portable/backup'
import { exportHtml, exportZip, publication } from '../src/portable/export'
import { mergeParagraph } from '../src/model/paragraphs'
import { withHistory } from '../src/model/store'

describe('portable structured stories', () => {
  it('merges adjacent text and preserves both notes, all graphics, and an undo snapshot', () => {
    const s = example(),
      merged = mergeParagraph(s, 'b')!
    expect(merged.caret).toBe(s.blocks[0].type === 'text' ? s.blocks[0].text.length : 0)
    expect(merged.story.notes.a).toBe('PRIVATE FIRST NOTE\n\nPRIVATE SECOND NOTE')
    expect(merged.story.blocks[1]).toEqual(s.blocks[2])
    const updated = withHistory(s, () => merged.story, 'Paragraphs merged')
    expect(JSON.parse(updated.history![0].snap).blocks).toEqual(s.blocks)
    expect(mergeParagraph(s, 'c')).toBeNull()
    expect(mergeParagraph(s, 'art')).toBeNull()
    expect(
      mergeParagraph(
        {
          ...s,
          blocks: s.blocks.map((b) => (b.id === 'b' ? { ...b, text: '' } : b)),
        },
        'b',
      )!.story.blocks,
    ).toHaveLength(4)
  })
  it('backs up all structured content and assets, without credential fields', () => {
    const story = withHistory(example(), (s) => ({ ...s, title: 'Updated' }), 'Title')
    const encoded = backup({ ...story, apiKey: 'TOP SECRET' } as typeof story)
    expect(encoded).not.toContain('TOP SECRET')
    expect(readBackup(encoded)).toEqual(story)
    expect(() => readBackup('{"format":"folio","version":2}')).toThrow()
    expect(() => readBackup('{"format":"folio","version":1,"story":{}}')).toThrow()
  })
  it('copies title and writing in reading order, never private conversations', () => {
    expect(storyText(example())).toBe(
      'A field of light\n\nFirst paragraph.\n\nSecond paragraph.\n\nAn interactive light.\n\nLast paragraph.\n\nA tiny image.',
    )
  })
  it('HTML publishes only the active output and optional notes, never prompts or histories', () => {
    const s = example(),
      html = exportHtml(s)
    for (const secret of ['PRIVATE FIRST NOTE', 'PRIVATE CHAT', 'PRIVATE INSTRUCTION', 'PRIVATE PROMPT'])
      expect(html).not.toContain(secret)
    expect(html).toContain('data:font/woff2')
    expect(html).toContain('Second paragraph.')
    expect(exportHtml(s, true)).toContain('PRIVATE FIRST NOTE')
    expect(publication(s).blocks).toHaveLength(5)
    expect(exportHtml({ ...s, style: { ...s.style, bg: '\" onload=\"alert(1)' } })).not.toContain(
      '<body style="background:" onload=',
    )
  })
  it('ZIP keeps its own assets and an offline index', () => {
    const files = unzipSync(exportZip(example()))
    expect(Object.keys(files)).toEqual(['assets/1.png', 'index.html'])
    expect(strFromU8(files['index.html'])).toContain('assets/1.png')
    expect(files['assets/1.png'].length).toBeGreaterThan(20)
  })
})
