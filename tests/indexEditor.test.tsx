import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import { indexExtensions, indexFromMarkdown, readIndexDocument } from '../src/write/IndexEditor'

describe('always-editable index', () => {
  it('imports rich Markdown, edits in place, and round trips without loss', () => {
    const doc = indexFromMarkdown(
      '## A heading\n\n**Bold** and *italic*, ~~gone~~, `code`, [a link](https://example.com).\n\n- one\n- two\n\n> A quote\n\n| Thing | Value |\n| --- | --- |\n| A | 2 |\n\n```js\nconst n = 2\n```',
    )
    const editor = new Editor({ extensions: indexExtensions(), content: doc })
    const html = editor.getHTML()
    expect(html).toContain('<h2>A heading</h2>')
    expect(html).toContain('<strong>Bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<table>')
    expect(html).toContain('<td><p>2</p></td>')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('language-js')
    editor.commands.insertContentAt(editor.state.doc.content.size, {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Added', marks: [{ type: 'underline' }] }],
    })
    expect(editor.getHTML()).toContain('<u>Added</u>')
    expect(readIndexDocument(JSON.stringify(editor.getJSON()))).toEqual(editor.getJSON())
    editor.commands.undo()
    expect(editor.getHTML()).toBe(html)
    editor.destroy()
  })
  it('does not import raw HTML, scripts, images or unsafe links', () => {
    const editor = new Editor({
      extensions: indexExtensions(),
      content: indexFromMarkdown(
        '<script>alert(1)</script>\n\n![Image](https://example.com/a.png) [bad](javascript:alert%281%29)',
      ),
    })
    expect(editor.getHTML()).not.toMatch(/<script|<img|href="javascript:/)
    expect(editor.getText()).toContain('Image')
    editor.destroy()
    expect(() => readIndexDocument('{broken')).toThrow()
    expect(() => readIndexDocument('{"type":"not-a-node"}')).toThrow()
  })
})
