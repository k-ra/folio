import { describe, expect, it } from 'vitest'
import { chatPolicy } from '../server/chatPolicy'
import { citedText, safeCitationUrl } from '../server/citations'
import { backup, readBackup } from '../src/portable/backup'
import { sameEssay } from '../src/model/history'
import { example } from './storyFixture'

describe('story chat preferences and sources', () => {
  it('defaults to no tools and rejects unsupported browsing providers', () => {
    expect(chatPolicy(undefined).research).toBeUndefined()
    expect(chatPolicy({ systemPrompt: 'Ask only questions.' }).instructions).toContain('Ask only questions.')
    expect(() => chatPolicy({ browsing: true, searchTopic: 'whales' }, 'claude')).toThrow('OpenAI')
  })
  it('keeps preferences in a lossless backup but not essay undo', () => {
    const before = example()
    const after = {
      ...before,
      chatSettings: { systemPrompt: 'Be succinct.', browsing: true, searchTopic: 'whales' },
    }
    expect(readBackup(backup(after)).chatSettings).toEqual(after.chatSettings)
    expect(sameEssay(before, after)).toBe(true)
  })
  it('renders safe inline citations and falls back for malformed ranges', () => {
    const annotations = [
      { type: 'url_citation', start_index: 5, end_index: 8, url: 'https://example.org/a(b)' },
    ]
    expect(citedText('Fact [1].', annotations)).toBe('Fact  [1](<https://example.org/a%28b%29>).')
    expect(citedText('Fact.', [{ ...annotations[0], end_index: 999 }])).toContain('Sources:')
    expect(safeCitationUrl('javascript:alert(1)')).toBeNull()
    expect(safeCitationUrl('https://secret@example.org')).toBeNull()
    expect(citedText('Text', [{ type: 'url_citation', url: 'javascript:alert(1)' }])).toBe('Text')
  })
})
