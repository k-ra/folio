import { afterEach, describe, expect, it, vi } from 'vitest'
import { claudeArgs, connectionStatus, generateText } from '../server/textModel'
import { connectedProvider, generationMode } from '../src/magic/provider'
import { FOLIO_STYLE } from '../src/style/presets'
import { chatContext } from '../src/ai/connected'
import { whaleStory } from '../src/model/samples/whales'

afterEach(() => vi.unstubAllGlobals())
describe('live connection', () => {
  it('defaults to live when configured, without overriding an explicit sample choice', () => {
    expect(generationMode(undefined, true)).toBe('connected')
    expect(generationMode('preview', true)).toBe('preview')
    expect(generationMode('connected', false)).toBe('connected')
    expect(generationMode(undefined, false)).toBe('preview')
    expect(connectionStatus({ FOLIO_TEXT_PROVIDER: 'claude', FOLIO_CLAUDE_CLI: '/local/claude' })).toEqual({
      configured: true,
      images: false,
      provider: 'Claude',
    })
    expect(JSON.stringify(connectionStatus({ OPENAI_API_KEY: 'never-expose-this' }))).not.toContain(
      'never-expose-this',
    )
  })
  it('uses the endpoint for data mode and never falls back after a live failure', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Offline' }) })
    vi.stubGlobal('fetch', fetch)
    await expect(
      connectedProvider.generate(
        {
          mode: 'data',
          instruction: 'Use tooltips',
          originalPrompt: 'Whales',
          attachments: [],
          history: [],
          style: FOLIO_STYLE,
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow('Offline')
    expect(fetch.mock.calls[0][0]).toBe('/api/magic')
  })
  it('local Claude has no tools, hooks, external MCP or saved sessions', () => {
    const args = claudeArgs({ instructions: 'Draw a chart', input: [] }, 'opus')
    expect(args).toContain('--safe-mode')
    expect(args[args.indexOf('--tools') + 1]).toBe('')
    expect(args).toContain('--strict-mcp-config')
    expect(args).toContain('--no-session-persistence')
    expect(args).not.toContain('--dangerously-skip-permissions')
  })
  it('sends only current story content and the complete source data to chat', () => {
    const story = whaleStory()
    const context = chatContext(story)
    expect(context.title).toBe(story.title)
    expect(context).not.toHaveProperty('history')
    expect(context).not.toHaveProperty('chats')
    expect(JSON.stringify(context)).toContain('right-whale-abundance.csv')
  })
  it('rejects incomplete OpenAI responses without passing them off as success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'incomplete', output: [] }) }),
    )
    await expect(
      generateText(
        { OPENAI_API_KEY: 'test' },
        { instructions: 'Draw', input: [] },
        new AbortController().signal,
      ),
    ).rejects.toThrow('complete result')
  })
})
