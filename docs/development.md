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
- `api/`: Vercel Node entry point. The function bundles the image-style reference WebPs explicitly. No server credentials enter the static build.
- `src/ai/session.ts`: tab-memory-only key and common request transport; never persist this state in the story model.

The public seed contains original neutral demonstrations and **Listening before translating**, a sourced whale essay with a real NOAA CSV. Source notes are in `src/model/samples/README.md`. `/?qa=essay` is an isolated test fixture; ordinary visitors open the demo from their story library.

Image styles have eight generated reference pills and six basic treatments. Each reference recipe saves one short editable direction. When the user explicitly generates an image, the server includes the matching bundled WebP as a separately labeled style-only reference. Browsing or applying styles makes no provider request. Editing the direction into a custom style detaches the built-in reference. Exact legacy directions remain recognized and migrate without rewriting custom wording or history. Preview-creation prompts are in `src/assets/image-studies/provenance.json` and `provenance-2026-09-18.json`. Only generated studies are bundled, not the user's original reference images.

The shared policy defaults to no lettering except explicitly requested copy or functional diagram labels. This is a model instruction, not a visual guarantee. User-supplied images, the current artifact, and the style reference have distinct labels in the request. Provider contract tests are offline; a live style-quality evaluation is still a separate check.

Magic supports Image, Graphics and Data. Finished artifacts share one editing conversation between margin and chat. Full bleed is reversible and does not regenerate. Fancy text styling preserves editable words. Backgrounds support gradients and sandboxed CSS. Follow [the shared grid rules](design-rules.md) for layout changes.

Style → Data, Graphics and Background start with **Choose a look**. **Make your own** switches the category to a focused visual preview and prompt, using `/api/style` and the same visitor connection. Each category keeps its own bounded conversation, named direction and optional interactive study inside the style draft. Earlier refinements are collapsed; Undo last refinement reverses the most recent step in the current maker session. Apply saves the draft with the story; Reset/close discard unapplied changes, and navigation aborts pending requests without losing unsent text. Generated studies are sandboxed like artifacts; data studies use six explicitly fictional points. Only the direction, not the study or its chat history, is forwarded to artifact generation. New styles do not regenerate existing artifacts. Background combines paper/ink palettes, gradients, atmosphere and paper layout in one workspace and one conversation. Its chat returns colors and optional isolated CSS internally, with no code editor. Legacy Color conversations remain accessible through Background. Link styling lives under Text. Existing saved CSS backgrounds remain renderable and refinable. See [the interface review](style-workspace.md).

Style → Images and the image prompt offer a transparent-background toggle. A finished image's settings offer Remove background as a versioned edit. The provider requests `background: transparent` and PNG output, following [OpenAI's image generation contract](https://developers.openai.com/api/docs/guides/image-generation). Automated tests mock the provider; actual image edges and generated study quality still need a deliberate live check with a visitor key.

Current limitations: cloud sync and reader publishing are not implemented. Style-prompt/home-theme helpers and explicit design samples are offline prototypes. D3/Three runtime packs remain [proposed](magic-graphics-research.md), not installed. For Vercel, bringing your own API key, or hosting static builds, see [hosting](hosting.md).
