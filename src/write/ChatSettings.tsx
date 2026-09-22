import { DEFAULT_CHAT_PROMPT } from '../ai/chatSettings'
import type { WriteCtl } from './ctl'
import './chatSettings.css'

export default function ChatSettings({ ctl }: { ctl: WriteCtl }) {
  const settings = ctl.story.chatSettings || {}
  return (
    <details className="chat-settings">
      <summary>Chat settings</summary>
      <div className="chat-settings-fields">
        <label className="chat-browsing">
          <input
            type="checkbox"
            checked={settings.browsing === true}
            disabled={ctl.busy}
            onChange={(e) => ctl.setChatSettings({ ...settings, browsing: e.currentTarget.checked })}
          />
          Browse the web
        </label>
        {settings.browsing && (
          <label>
            Public search topic
            <input
              aria-label="Public search topic"
              type="text"
              maxLength={500}
              disabled={ctl.busy}
              placeholder="e.g. recent sperm whale communication research"
              value={settings.searchTopic || ''}
              onChange={(e) => ctl.setChatSettings({ ...settings, searchTopic: e.currentTarget.value })}
            />
          </label>
        )}
        <small>
          Only this topic goes to web research—not your essay, notes or prompt. Up to 3 web calls per reply;
          search and two model calls may be billed. Requires an OpenAI key.
        </small>
        <label>
          System prompt
          <textarea
            aria-label="Chat system prompt"
            rows={5}
            maxLength={6000}
            disabled={ctl.busy}
            value={settings.systemPrompt ?? DEFAULT_CHAT_PROMPT}
            onChange={(e) => ctl.setChatSettings({ ...settings, systemPrompt: e.currentTarget.value })}
          />
        </label>
        <div className="chat-settings-bottom">
          <small>Saved with this story. Applies to future chat replies, not artifacts.</small>
          <button
            type="button"
            disabled={ctl.busy}
            onClick={() => ctl.setChatSettings({ ...settings, systemPrompt: undefined })}
          >
            Reset prompt
          </button>
        </div>
      </div>
    </details>
  )
}
