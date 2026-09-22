import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import Markdown from '../src/text/Markdown'
import { loadIndex, selectionMarkdown } from '../src/write/indexMarkdown'

function clip(html: string, select?: (root: HTMLElement, range: Range) => void) {
  const root = document.createElement('div')
  root.innerHTML = html
  const range = document.createRange()
  range.selectNodeContents(root)
  select?.(root, range)
  return selectionMarkdown(root, range)
}

describe('content-only Markdown index', () => {
  it('preserves headings, nested emphasis, lists, links, quotes, and code', () => {
    const markdown = clip(
      '<h3>A thought</h3><p><strong>Bold <em>and italic</em></strong> with <a href="https://example.com/a(b)">a link</a>.</p><ol start="3"><li>Third</li><li>Fourth</li></ol><blockquote><p>Quiet words</p></blockquote><pre><code class="language-js">const a = `x`;</code></pre>',
    )
    const { container } = render(<Markdown>{markdown}</Markdown>)
    expect(container.querySelector('h3')?.textContent).toBe('A thought')
    expect(container.querySelector('strong em')?.textContent).toBe('and italic')
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/a(b)')
    expect(container.querySelector('ol')?.start).toBe(3)
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('blockquote')?.textContent).toContain('Quiet words')
    expect(container.querySelector('pre code')?.textContent?.trim()).toBe('const a = `x`;')
  })

  it('keeps emphasis when selecting only part of an inline node', () => {
    expect(
      clip('<p>Before <strong>important words</strong> after</p>', (root, range) => {
        const text = root.querySelector('strong')!.firstChild!
        range.setStart(text, 2)
        range.setEnd(text, 9)
      }),
    ).toBe('**portant**')
  })

  it('retains nested lists and tables without flattening them', () => {
    const markdown = clip(
      '<ul><li>One<ul><li><em>Nested</em></li></ul></li><li>Two</li></ul><table><thead><tr><th>Thing</th><th>Value</th></tr></thead><tbody><tr><td>A | B</td><td><strong>2</strong></td></tr></tbody></table>',
    )
    const { container } = render(<Markdown>{markdown}</Markdown>)
    expect(container.querySelector('ul ul em')?.textContent).toBe('Nested')
    expect(container.querySelectorAll('td')).toHaveLength(2)
    expect(container.querySelector('td')?.textContent).toBe('A | B')
    expect(container.querySelector('td strong')?.textContent).toBe('2')
  })

  it('does not reinterpret author punctuation or keep unsafe links and controls', () => {
    const markdown = clip(
      '<p>*literal* &lt;script&gt; <a href="javascript:alert(1)">safe words</a><button>Keep</button></p>',
    )
    const { container } = render(<Markdown>{markdown}</Markdown>)
    expect(container.textContent).toBe('*literal* <script> safe words')
    expect(container.querySelector('em,script,a,button')).toBeNull()
  })

  it('migrates only excerpts and leaves old provenance untouched', () => {
    localStorage.clear()
    const old = JSON.stringify([
      { excerpt: '*literal*', context: 'PRIVATE OTHER CONVERSATION', source: 'chat' },
    ])
    localStorage.setItem('v2', old)
    expect(loadIndex(localStorage, 'v3', 'v2')).toBe('\\*literal\\*')
    expect(localStorage.getItem('v2')).toBe(old)
    localStorage.setItem('v3', '')
    expect(loadIndex(localStorage, 'v3', 'v2')).toBe('')
    localStorage.removeItem('v3')
    localStorage.setItem('v2', 'corrupt')
    expect(() => loadIndex(localStorage, 'v3', 'v2')).toThrow()
    expect(localStorage.getItem('v2')).toBe('corrupt')
  })

  it('retains task checkboxes, separators, and literal entity text', () => {
    const markdown = clip(
      '<ul><li><input type="checkbox" checked disabled>Done</li><li><input type="checkbox" disabled>Next</li></ul><hr><p>&amp;copy; is literal</p>',
    )
    const { container } = render(<Markdown>{markdown}</Markdown>)
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2)
    expect(container.querySelector<HTMLInputElement>('input')?.checked).toBe(true)
    expect(container.querySelector('hr')).not.toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('&copy; is literal')
  })
})
