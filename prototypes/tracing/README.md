# INDEX study — not on main

Run the public app's Vite dev server, then open `/prototypes/tracing/`. This is an isolated interaction prototype, not a replacement editor. It never reads Folio stories, calls a model, or uploads anything.

- Select words in chat or the essay to reveal **Save to index** beside the selection. No per-message action is repeated. Tab focuses the action; Escape dismisses it. Exact duplicates are ignored.
- **CHAT / INDEX** share one left drawer. Switching tabs preserves the chat's scroll position. An excerpt expands into its saved context; the source action returns to the passage in chat or the essay.
- **No AI** still has a research notebook: add your own thoughts and clip them.
- Clicking the example graphic opens its separate conversation on the right. That rail does not exist before selecting the graphic. Its session-only instructions never enter research chat.
- Research notes and clippings use a separate browser storage key (`folio.prototype.tracing-index.v1`). Storage failures are visible. The sample essay is read-only. `live-response.md` is an 831-word response captured from one explicitly authorized Claude request about this fictional essay on 2026-09-21. The prototype replays it locally; opening the page makes no AI request and sends no writing.

## Decision

The essay is the work; the left drawer holds research nearby; each clipping retains provenance. The index should not become another transcript or silently insert AI text into writing. Only the excerpt is initially visible. Expanded context is a snapshot, so later research does not rewrite its meaning.

Before merging: try real reading sessions, decide whether a clipping needs a paragraph anchor, and add structured-story storage, backup/cloud migration, accessible focus restoration, and publication exclusion tests. Do not merge this stand-alone localStorage prototype as production persistence. Live AI and object editing remain disconnected here deliberately.
