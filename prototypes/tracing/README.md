# INDEX study — not on main

Run the public app's Vite dev server, then open `/prototypes/tracing/`. This is an isolated interaction prototype, not a replacement editor. It never reads Folio stories, calls a model, or uploads anything.

- **Keep** saves a whole research message, or just a selection inside it. Duplicate keeps are ignored. **In index** links back to the clipping.
- **INDEX** opens a translucent sheet above the essay. An excerpt expands into the conversation snapshot from when it was kept; **Open research chat** returns to its source.
- **No AI** still has a research notebook: add your own thoughts and clip them.
- Clicking the example graphic opens its separate conversation on the right. That rail does not exist before selecting the graphic. Its session-only instructions never enter research chat.
- Research notes and clippings use a separate browser storage key (`folio.prototype.tracing-index.v1`). Storage failures are visible. The sample essay is read-only; the sample Folio response is written fixture content, not a live model response.

## Decision

Keep the metaphor functional: the essay is the work; the tracing sheet is material held nearby; each clipping retains provenance. The index should not become another transcript or silently insert AI text into writing. Only the excerpt is initially visible. Expanded context is a snapshot, so later research does not rewrite its meaning.

Before merging: try real reading sessions, decide whether a clipping needs a paragraph anchor, and add structured-story storage, backup/cloud migration, accessible focus restoration, and publication exclusion tests. Do not merge this stand-alone localStorage prototype as production persistence. Live AI and object editing remain disconnected here deliberately.
