# Developing Folio

React, TypeScript and Vite. A local-first writing app with block-scoped AI editing.

```bash
npm ci
npm run dev
npm test
npm run build
FOLIO_QA_PREVIEW=1 npm run test:e2e
```

The browser suite uses `tests/browser/fixtures.ts` to block live generation. Production QA runs on port 4173, separate from the editor on 5173. It covers saving, edit history, chat/margin synchronization, style drafts, responsive layout, full bleed and sandboxed artifacts. Use `npm run qa:live` only for a deliberately authorized live check; it spends two model requests on a disposable demo.

## Boundaries

- `src/model/`: stories, versions, migrations and IndexedDB persistence.
- `src/write/`: writing grid, margins, rail controls and panels.
- `src/magic/`: prompt modes, provider contract, artifact rendering and revisions.
- `src/style/`: category galleries, presets and reversible draft previews.
- `server/`: shared, request-scoped AI handlers with a local Vite adapter. `routes.ts` enforces the hosted BYOK boundary; `http.ts` handles both streamed and pre-parsed request bodies.
- `api/`: Vercel Node entry point. The function bundles the four image-style references explicitly. No server credentials enter the static build.
- `src/ai/session.ts`: tab-memory-only key and common request transport; never persist this state in the story model.

The public seed contains original neutral demonstrations and **Listening before translating**, a sourced whale essay with a real NOAA CSV. Source notes are in `src/model/samples/README.md`. `/?qa=essay` is an isolated test fixture; ordinary visitors open the demo from their story library.

Image styles have four generated reference pills and six basic treatments. The four recipes save one short editable direction. When the user explicitly generates an image, the server includes the matching bundled WebP as a separately labeled style-only reference. Browsing or applying styles makes no provider request. Editing the direction into a custom style detaches the built-in reference. Exact legacy directions remain recognized and migrate without rewriting custom wording or history. The original preview-creation prompts remain unchanged in `src/assets/image-studies/provenance.json`.

The shared policy defaults to no lettering except explicitly requested copy or functional diagram labels. This is a model instruction, not a visual guarantee. User-supplied images, the current artifact, and the style reference have distinct labels in the request. Provider contract tests are offline; a live style-quality evaluation is still a separate check.

Magic supports Image, Graphics and Data. Finished artifacts share one editing conversation between margin and chat. Full bleed is reversible and does not regenerate. Fancy text styling preserves editable words. Backgrounds support gradients and sandboxed CSS. Follow [the shared grid rules](design-rules.md) for layout changes.

Current limitations: cloud sync and reader publishing are not implemented. Style-prompt/home-theme helpers and explicit design samples are offline prototypes. D3/Three runtime packs remain [proposed](magic-graphics-research.md), not installed. For Vercel, bringing your own API key, or hosting static builds, see [hosting](hosting.md).
