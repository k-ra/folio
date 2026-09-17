# Magic blocks & Style

## Try it

Run `npm run dev` and open *Listening before translating* from the normal story stack. It includes prose, a margin note, an unfinished rhythm diagram prompt and the real-data whale chart. It saves and keeps history like any other story, with no special link or playground toolbar. Old `?demo=magic` links open this saved story and clear the legacy URL parameters.

The shared sample factory is `src/model/samples/mockEssay.ts`. New workspaces include it; existing workspaces get a one-time, atomic setup update. Previously edited whale stories and all other stories are preserved. The setup marker is stored separately from stories so deletion does not recreate the sample. An untouched old whale sample gains the note and draft without replacing its style or existing notes.

The essay combines Project CETI context with a separate North Atlantic right-whale chart from the original NOAA 1990–2024 CSV. The original file is pre-attached and downloadable under Source notes, including uncertainty columns. Browser visual tests and opt-in live checks use an isolated copy at `?qa=essay`; its test-only paper/reset controls never appear on the ordinary saved story. Separate browser tests verify normal persistence, history and deletion.

- Choose Image, Graphics, or Data in a new magic block. Type a prompt and press Create or Enter (Shift+Enter adds a line).
- Prose focus is a thin grey left rule, never a surrounding box. A prompt has a persistent full outline; a completed artifact has a full outline only when selected or focused. Keyboard focus remains visible, and interactive artifact contents stay usable.
- Prompt settings live under the **···** control. Connected generation is the default when a model is configured; an explicit Design sample choice stays offline.
- Data accepts CSV/TSV with a header row, a label column, and numeric values. Use the numeric column name in the prompt to select it. Missing values are skipped, negatives are preserved, and charts support pointer and keyboard inspection.
- Image/Graphics accept reference images and optional data attachments. Local previews are fixed samples, not prompt-complete AI output. Connected generation supports arbitrary image prompts and self-contained HTML/SVG interactions.
- Each mode has an invitation as a native placeholder inside the empty prompt. It disappears as soon as any text is entered; there is no repeated heading above a typed or prefilled prompt. Block remove controls sit at each block’s vertical center.
- A finished artifact's margin has one button: Open in chat when the instruction matches the selected revision, Send to chat for an unsent edit. Whitespace alone is not an edit; an empty edit cannot be submitted. Opening chat does not regenerate or add a revision. Subsequent chat edits, even after closing/reopening the panel, update the same margin when generation succeeds.
- Offline samples understand “caption: A new title”, “use bars”, “use a line”, and “use an area”. Connected Data sends the original CSV, preceding chart/HTML and edit history to the model for richer transformations, including tooltips. It never falls back to the local renderer after a failed live request.
- A finished artifact has just one source caption below it. Source labels are saved per revision, so preparing the next edit’s attachments does not relabel the current output. Margin instructions share ordinary notes’ responsive placement: a right-hand margin when the sheet is at least 992 px wide, or a compact right-aligned note below the block otherwise. Equal page gutters keep the writing column centered even in narrow containers and beside open panels; the text itself remains left-aligned.
- Chat is just CHAT, conversation and composer, with no quote treatment, disclosure stack or divider rules. The artifact's **···** menu holds Sources & generation and Versions. Undo/redo restores output, generation style and margin instruction together, without changing the active connection choice. A new edit after undo starts a new branch and drops redo versions. The last 12 versions are retained per artifact.
- Reopening the same artifact chat preserves its unsent composer draft. Sources & generation also holds an explicit Regenerate action for rerunning the same instruction after changing its files or provider; this does not add a second margin button.
- Weave (lines across the whole field) is the active loader. Contour and Written remain implemented as interchangeable studies, but are not exposed in Style. Reduced-motion preferences use static linework. During an edit, loading keeps the preceding artifact’s height.
- Style starts with six current-choice summaries: Text, Color, Images, Graphics, Data, and Background. Each replaces the overview with a dedicated gallery and category-specific controls; Back to Style preserves the draft and returns focus to the category. Theme opens complete presets and the custom-save form. Images offers Folio, Etching, Grain, Cut paper, Natural, and Soft light: code-native studies of a direction, not promised model output. Complete presets can be mixed by category. Saved custom combinations belong to the current story. The specimen reacts immediately; page typography/colors also preview. Images and HTML are regenerated only when requested; the specimen does not spend API credits. Link styling is demonstrated in the specimen; rich-text links are not yet supported by the plain-text essay editor.

## Modules

| Module | Responsibility |
| --- | --- |
| `src/magic/contract.ts` | Generation request shared by client and server |
| `src/magic/state.ts` | Atomic artifact/margin/chat commit and revision restore |
| `src/magic/useMagic.ts` | Provider calls, per-artifact request guards, abort/retry, attachment edits |
| `src/magic/provider.ts` | Offline samples, local CSV charts, connected HTTP adapter |
| `src/magic/data.ts` | Attachment validation and CSV/TSV parser |
| `src/magic/limits.ts` | Shared decoded-byte, aggregate, count, and request limits |
| `src/magic/MagicBlock.tsx` | Prompt modes, loading, source caption, margin editing |
| `src/write/MarginNote.tsx` | Shared right-hand margin for ordinary notes and artifact instructions |
| `src/magic/ArtifactControls.tsx` | Attachments, generation choice, and versions in artifact settings |
| `src/magic/source.ts` | Per-revision source labels and minimal captions |
| `src/magic/ArtifactView.tsx` | Chart, image, and isolated HTML renderers |
| `src/magic/Loading.tsx` | Three interchangeable loading treatments |
| `src/style/` | Full-panel category views, shared choice grids, image studies, presets, live specimen |
| `src/magic/models.ts` | Shared image-model choices, validation, and Responses tool configuration |
| `src/model/storage.ts` | Atomic IndexedDB workspace persistence |
| `src/model/migrate.ts` | Non-destructive legacy graphic conversion and interrupted-request recovery |
| `server/magic.ts` | Local Vite API bridge; server-only credentials |
| `server/textModel.ts` | OpenAI or opt-in local Claude text transport; no browser credentials |
| `server/chat.ts`, `src/ai/connected.ts` | Conversation with current story, data, selected passage and prior turns |
| `src/style/BackgroundChoices.tsx` | Gradient controls and explicit custom-background generation/preview |
| `src/style/backgrounds.ts` | Gradient CSS and scriptless custom-background document |
| `server/background.ts` | Local strict-JSON background generation bridge |
| `src/home/StoryOpening.tsx` | One short paper expansion with cancellation/motion fallbacks |
| `src/model/samples/whales.ts` | Attributed mock essay and real pre-attached NOAA CSV |

The latest committed revision is the source of truth for the artifact and its margin instruction. An unsent/failed edit is held separately as `editDraft`. Both margin and chat use `generate()`, then `commitArtifact()`. Request IDs reject stale responses; abort cancels pending work, and a deleted block cannot be recreated by a late response. Successful edits add the user instruction and the result message to the artifact's own conversation atomically.

HTML runs in an opaque-origin iframe (`sandbox="allow-scripts"`). Its CSP blocks external resources, network requests, forms, and base URL changes. It cannot read the editor, storage, or other artifacts. An HTML artifact can run inline scripts for its own interaction.

Custom backgrounds use a stricter, empty iframe sandbox: CSS only, no scripts or external resources. Background → Gradient exposes three color stops, direction, and optional motion. Background → Custom code accepts a description for GPT or manual CSS. Generate uses the existing text model with strict JSON output and requires the dev bridge; browsing, editing CSS, and Apply make no API requests. Failed/cancelled requests preserve the current draft, and closing/resetting aborts generation. Reduced motion uses the plain paper fallback rather than running arbitrary CSS animation. Apply saves a background through ordinary style history, so it can be undone.

## Connected generation

Set `OPENAI_API_KEY` in the ignored `.env.local`; optionally override `FOLIO_TEXT_MODEL` and `FOLIO_IMAGE_MODEL`. Alternatively set `FOLIO_TEXT_PROVIDER=claude`, `FOLIO_CLAUDE_CLI=/absolute/path/to/claude`, and optionally `FOLIO_CLAUDE_MODEL=opus`. The local Claude path uses the installed CLI's sign-in, not extracted credentials. It runs in safe mode with all tools disabled, no MCP servers, no browser integration, and no session persistence. Image references/generation require OpenAI. Restart the dev server; connected generation is selected by default, but nothing is submitted automatically. Artifact requests contain only that artifact's original prompt, edit history, preceding output, styling and attachments. Ordinary story chat separately sends the current story and up to 24 conversation messages, never other stories or saved story snapshots.

Image requests use the Responses API image-generation tool, with the previous image supplied as an image input for edits. Graphics and Data use structured HTML/caption output. Model defaults follow the [official image-generation guide](https://developers.openai.com/api/docs/guides/image-generation); the response contract follows [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). The local Claude adapter follows [programmatic CLI usage](https://code.claude.com/docs/en/headless). Automated tests block live endpoints unless a test explicitly mocks a response.

Style → Images → Generation model chooses the server default, `gpt-image-2.5-sunburst`, or `gpt-image-2.5-flare`. The selection configures `tools[].model` in Responses, not the top-level text model, following the [official image-generation API guidance](https://developers.openai.com/api/docs/guides/image-generation). The server rejects unrecognized choices. Default and older stories keep `FOLIO_IMAGE_MODEL`; selecting a theme never overwrites model configuration. Model choices are part of the draft, so Apply saves them and Reset/closing discards unapplied changes. Local previews do not use them; API account access is still required for connected generation.

The bridge exists only in the local Vite dev server. A production deployment needs an authenticated server route implementing the same contract. Never expose a key through a `VITE_` environment variable.

## Limits and recovery

- Four attachments per block, at most 20 MB each and 40 MB total (decoded image bytes / UTF-8 text); the server allows up to 64 MB JSON including base64 overhead and prior output. CSVs still have up to 500 valid numeric rows.
- Offline Data charts the first attached data file (up to 500 valid rows). Connected Data can use all attached data; the local Claude transport caps its input at 1 MB, and ordinary chat also has a 1 MB request limit. These model-context limits are separate from attachment storage limits. Oversized input yields a clear error, never silently truncated data.
- Image/HTML rendering is a first pass: HTML uses a fixed-height frame, and local image previews are illustrative SVG samples. They are labeled as samples.
- The original v1 localStorage payload remains intact. The new editor writes IndexedDB separately, so returning to the prior implementation still reads its original data.
- Story history keeps 60 checkpoints; artifact history keeps 12 versions. These are local revision controls, not server backups.
- The isolated playground provides the easiest way to review/revoke experiments. Current refinements are on `codex/object-states-story-styles`; Apply/history and playground Reset provide reversible review flows.

## Automated QA

`npm test` verifies repeated margin/chat edits and reloading the serialized state, original prompt/history context, per-artifact isolation, undo/redo branching, failure recovery, cancellation races, double-send protection, deletion during generation, migration, CSV parsing, image-model validation/defaults, and the outgoing image-tool configuration.

`npm run test:e2e` drives the actual editor in Chrome. It covers margin Send → left chat → repeated edits → margin → undo/redo → reload, CSV uploads and chart types, category-first Style, full-panel navigation on desktop/mobile with focus restoration, deeper theme mixing/apply/reset/save, image-model persistence and request routing, Weave, responsive note placement with chat open, centered writing across eight widths including floating sheets, body-aligned sticky orbs under wrapped or empty titles, reduced motion, connected-provider error/retry and context, and iframe interaction/isolation. No paid API calls are made by these tests.
