# Bounded research — proposal, not enabled

Folio's `/api/chat` currently tells the model that no tools or network are available. `server/textModel.ts` already uses OpenAI Responses, but returns only text and discards tool/citation metadata. A browsing prompt alone will not fix this.

Add an explicit **Search the web** action to the research conversation, not the artifact/style agent. Ordinary chat remains tool-free. No AI remains a personal notebook with clippings.

First implementation:

1. Reuse request-scoped BYOK and same-origin checks. A research-only endpoint accepts the question and a user-chosen passage, not the full essay, private notes, or credentials in the search payload.
2. Use Responses `web_search`, `max_tool_calls: 3`, a bounded output-token count, a server deadline and cancellation. Show that web research uses the visitor's API billing. A call budget is not a dollar cap; enforce a separate session budget before later requests if users need one.
3. Preserve `url_citation` annotations and the complete consulted-source list. Render clickable inline citations, show which pages actually support each claim, and explicitly report incomplete/failed searches. Search snippets alone should not support a precise claim that needs the full source.
4. Offer an optional primary-source domain allowlist for constrained work. Prefer original research and official documentation; a default open-web search is useful for discovery, with dated sources visible.
5. Treat fetched pages as untrusted evidence, never instructions. No shell, arbitrary fetch proxy, authenticated-site access, downloading executables, or tool access to story mutation. Tools cannot write the essay. Do not follow webpage requests to reveal keys or upload local content.
6. Save selected excerpts and citation metadata into clippings only after Keep. Do not mirror whole copyrighted articles. Preserve date accessed and source URL. All research remains private unless explicitly published later.

The local Claude CLI path is intentionally tool-disabled; leave that contract intact initially and show research as unavailable for that connection. Supporting it is a separate provider integration, not permission to enable an unrestricted CLI agent.

QA should mock searches: deadline, cancellation, tool-budget exhaustion, provider failure, unsupported models, malicious page instructions, misleading search snippets, citation ranges, No AI making no request, no implicit whole-story disclosure, and clipping provenance after reload/export. Real provider/model compatibility and costs require a separately authorized live check.

Official references: [web search and citations](https://developers.openai.com/api/docs/guides/tools-web-search), [Responses request options](https://developers.openai.com/api/reference/cli/resources/responses/methods/create). Domain filtering is supported; `search_context_size` controls context size, not an exact source count. Keep model choice configurable and verify tool support for the configured model before enabling research.
