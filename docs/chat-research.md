# Chat research

Open a story's Chat → Chat settings. Edit the system prompt (up to 6,000 characters), or Reset prompt to Folio's default. Changes apply to future replies. Preferences save with the story locally and, when connected, through its existing private cloud storage. They round-trip in `.folio` backups, but do not appear in HTML publications or writing history. Artifact and style conversations do not use these settings.

Browsing is off by default. Enable Browse the web and enter a **public search topic** (up to 500 characters). Sending a chat message then makes two sequential provider calls:

1. Research receives only that explicit public topic and a fixed server instruction. It has OpenAI's read-only `web_search`, low search context, a maximum of three tool calls and an 8,000-output-token limit. No essay, notes, attachments, chat history or editable system prompt enters this request.
2. The ordinary, tool-free conversation receives the current story, selected passage, previous turns, editable prompt and research results. It can discuss the findings, but cannot search further or modify the story.

Both calls share the existing 180-second request timeout, cancellation signal and visitor key, with `store: false`. Search plus both model calls may incur charges. Browsing remains enabled for subsequent sends until turned off; each send researches the current public topic again. No background browsing or automatic retry occurs. Errors surface in chat and preserve the draft. No AI prevents web research. The local Claude CLI does not gain tools; browsing requires an OpenAI key. Static-only hosting cannot run it.

Provider URL annotations are converted into safe clickable Markdown and returned sources are appended to the reply. Invalid URL schemes/credentials are rejected. Retrieved content is explicitly untrusted. A response without cited sources is labeled unverified. Search results and model summaries still require human judgment; neither a bounded search nor a source link guarantees factual correctness.

No new service, database or secret is required beyond existing BYOK Vercel/local deployment. The configured OpenAI model must support web search; unsupported-provider/model errors are surfaced rather than silently switching providers. Visitor keys can be remembered in that browser but remain outside stories/backups.

Contract references: [web search and citations](https://developers.openai.com/api/docs/guides/tools-web-search), [Responses tool-call limits](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).

Offline QA: `chatSettings.test.ts`, `hosting.test.ts`, `browser/chatSettings.spec.ts`. These assert private-context separation, server-owned budgets, unsupported providers, failed search, safe citations, prompt reset/persistence, backup round-trip and no essay undo entries. No paid live browsing check has been performed.
