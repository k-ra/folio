# INDEX in the actual editor — prototype branch only

Run `npm run dev -- --port 5174` on `prototype/tracing-index`, then open `/` and any story. This is the full Folio app: its normal homepage, editor, style panel, margins, artifacts, saving and AI connection. No replacement layout, fonts, demonstration toolbar, or extra rail controls. The old `/prototypes/tracing/` URL redirects to the actual app; the old standalone study source is retained only as design history.

- Open the existing chat orb. **INDEX** sits beside **CHAT** in the existing drawer header and uses its normal width/resizing. Switching tabs preserves the mounted conversation and reading position.
- Highlight writing or research chat to reveal **Save to index**. Native textareas, rich text and cross-paragraph selection are supported; margin notes are excluded. Selection never changes the author's text.
- INDEX is one content-only Markdown document. Selected headings, emphasis, lists, links, quotes, tables and code retain their formatting, including partial selections within emphasized text. Edit/Done exposes the Markdown for rearranging or removing passages. No source labels, conversation snapshots, or permanent Keep buttons. Artifact editing keeps its existing controls and conversation behavior.
- The Markdown lives only in this origin's browser storage, scoped by account and story (`folio.index-study.v3`). It does not yet enter cloud payloads, backups or publication exports. Old v2 excerpts load as literal text; their original storage remains untouched for recovery, but context/provenance is not copied into the new document. Already-flattened formatting cannot be recovered automatically. Read/write failures preserve the stored copy and surface a warning.

The normal chat uses Folio's actual existing AI connection. Tests reuse `live-response.md`, an 831-word response captured from one authorized Claude request about a fictional essay on 2026-09-21. No additional live generation is part of QA.

For zero-cost manual testing, choose **Open offline chat sample** in homepage settings or Chat settings. It creates one ordinary **Chat playground** story with an original fictional essay and two long, formatted canned replies. The chat opens immediately. Follow-ups remain canned and bypass the provider even when AI is connected. The sample is clearly labeled; real stories keep their existing behavior. Reopening the action reuses the saved sample without resetting edits, conversations or clippings. It enters the active workspace only after that explicit click, using normal local/cloud storage and backup rules. No credentials are provisioned or persisted.

Run `npx playwright test --config prototypes/tracing/playwright.config.ts` for real-editor desktop/mobile clipping tests. The shared rail, centering, orbs, layout, scroll, editor and product-polish suites remain unchanged and must pass.

Before merging: approve placement in the real app, finish keyboard and long-selection anchoring review, and integrate the Markdown document into the versioned story schema, cloud/backup migrations and publication privacy tests. This is not production clipping persistence and stays off main.
