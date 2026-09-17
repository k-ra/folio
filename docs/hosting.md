# Hosting and storage

## Bring your own API — works locally today

1. Clone the repo, run `npm ci`, and copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` to your own key and start `npm run dev`.
3. Open the localhost URL. Explicit generation and chat requests use your provider account; model access and usage limits apply.

Never commit `.env.local`, use a `VITE_` prefix for secrets, put a key into a public build, or publish a local subscription's credentials. The browser sends the relevant prompt, history, style and attachments to the local server; the server sends that context to your provider. Selecting an image preset sends its bundled style reference only when you generate. Writing and saving without live generation stay local.

The optional local Claude connection is documented in `.env.example`; image generation requires OpenAI. A subscription login is not a credential for visitors to share.

## GitHub Pages — static editor

Build with `npm run build -- --base=./` and publish **only `dist/`**, not the project folder. Relative asset paths support a project site such as `https://YOUR-NAME.github.io/folio/`. Enable Pages and use the [official Vite GitHub Pages deployment guide](https://vite.dev/guide/static-deploy.html#github-pages) for the build/deploy workflow. The base can instead be set to your repo path (for example `/folio/`) at build time.

Pages can serve the writing UI, saved artifacts and offline design samples. It cannot run the `server/` Vite middleware, so live generation is unavailable on a Pages-only installation. See [GitHub's static-hosting documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

A hosted bring-your-own-key experience is a future integration: use an authenticated private backend, keep credentials server-side, enforce per-user access and usage limits, and provide explicit revocation. Never open the development server to the internet or inject a shared key into GitHub Actions build variables. There is no remote-backend URL setting or browser key-entry form in this release.

No Pages deployment is enabled automatically by this repository.

## Where stories live

Folio uses IndexedDB (`folio-artifacts-v2`) for stories and generated artifacts, plus localStorage for the home preference. Each visitor has their own browser-local workspace—not a folder committed to GitHub and not shared cloud storage. Returning to the same origin in the same browser profile normally restores it; another device, browser profile or domain starts separately. Your localhost stories do not automatically move to a hosted URL.

Browser storage can be cleared, private sessions are temporary, and quota/eviction rules vary. It is not a backup. GitHub project paths under one `USERNAME.github.io` origin share browser storage, so independent installations under that same origin should use distinct storage names or separate domains. [MDN explains origins, quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

The app offers an emergency JSON export when saving fails, but a general export/import workflow and persistent-storage request are still pending. Do not use this early prototype as the only copy of irreplaceable writing.

## Optional cloud sync — proposed

Keep IndexedDB as the fast local copy. Add sign-in, per-user story/version records and private object storage for images and attachments. Supabase is one possible implementation using [Auth](https://supabase.com/docs/guides/auth) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security); it is not connected here. Sync also needs offline queues, conflict handling, deletion semantics and an export/restore path. Publishing an essay should be a separate explicit action, never a side effect of syncing.
