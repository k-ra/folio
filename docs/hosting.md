# Hosting and storage

## Vercel — editor and opt-in live AI

Import this repository into Vercel, or redeploy your existing connected project. Use the repository root, the **Vite** framework preset, `npm run build`, and output directory `dist`. The checked-in `vercel.json` supplies these settings and a Node function for `/api/*`; no separate backend or database is needed. Enable **Fluid compute** for the configured 300-second function limit. The app's own generation timeouts are shorter.

**No API-key environment variable is required for the public site.** Each visitor opens the homepage settings orb, chooses **AI**, selects OpenAI or Anthropic, and enters their own API key (or opens **AI / NO AI** inside a story). Saving it remembers it in this browser's localStorage, separately by provider and signed-in account or guest. It is not synchronized by Google or Supabase, included in stories, or exported. **No AI** pauses use without deleting the remembered key; **Forget** removes the selected provider's key from this browser. Saving a key does not validate it or call a paid model; the first explicit generation/chat request checks access.

On an explicit AI request, the browser sends the selected provider and key in headers over HTTPS to the same-origin Vercel function. The function forwards the relevant context to OpenAI (`store: false`) or Anthropic using that request's key, then returns the result. Folio's server does not log or persist keys. The deployment operator and hosting infrastructure necessarily handle the request: visitors should use only a deployment they trust. Do not enable request-header/body logging in monitoring or log drains. Browser extensions, compromised page scripts, and anyone with access to the browser profile can read locally saved keys; Google sign-in does not encrypt them. Use a restricted project key with spend limits and rotate it if exposed.

The hosted function **never falls back to an owner's `OPENAI_API_KEY` or a local Claude sign-in**, even if those variables are set accidentally. The optional `FOLIO_TEXT_MODEL` and `FOLIO_IMAGE_MODEL` variables override the repository's existing defaults; visitors need provider access to the selected models and pay their own API usage. Subscription sign-ins are not shared with visitors. Disconnecting cannot recall a request already sent to the provider.

Generation, artifact edits, chat, fancy text and custom backgrounds use the same request-scoped connection. Anthropic supports chat and code-based graphics/data; image generation and Folio's bounded web research still require OpenAI. Selecting Anthropic never falls back to a remembered OpenAI key. Writing saves locally first; optional account sync is independent of AI. Selecting a preset does not contact a model. Large image results use a streamed response; inputs are limited to **4 MB for the complete JSON request** on this host, including base64 overhead, history and the previous artifact. The browser checks this before upload. Larger attached files can stay in a story but require a smaller extract/image for hosted generation, or the local server. This avoids Vercel's [4.5 MB request/buffered-response limit](https://vercel.com/docs/functions/limitations) independently of optional account storage.

Before a wide launch, configure Vercel Firewall rate limits and spend alerts: BYOK prevents visitors spending an owner's OpenAI credits, but function traffic still consumes the deployment's hosting allowance. Optional cloud accounts do not add a distributed per-user AI quota service.

After deploying, check `/api/magic/status`: it should report `byok: true` and `configured: false` without revealing any secret. Confirm a story saves across reload; on a trusted browser, a saved key survives reload, **No AI** pauses it, and **Forget** removes it. Test one small live chat, graphic, image, text style and background deliberately with your own key; model-quality and account-access checks spend API usage and are not part of automated QA.

References: [Vercel's Vite integration](https://vercel.com/docs/frameworks/frontend/vite), [Node functions](https://vercel.com/docs/functions/runtimes/node-js), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), and [OpenAI authentication](https://developers.openai.com/api/reference/overview#authentication).

## Bring your own API — local development

1. Clone the repo, run `npm ci`, and copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` to your own key and start `npm run dev`.
3. Open the localhost URL. Explicit generation and chat requests use your provider account; model access and usage limits apply.

Never commit `.env.local`, use a `VITE_` prefix for secrets, put a key into a public build, or publish a local subscription's credentials. The browser sends the relevant prompt, history, style and attachments to the local server; the server sends that context to your provider. Selecting an image preset sends its bundled style reference only when you generate. Cloud story saving is separately opt-in; AI credentials are never included.

The optional local Claude connection is documented in `.env.example`; image generation requires OpenAI. A subscription login is not a credential for visitors to share.

## GitHub Pages — static editor

Build with `npm run build -- --base=./` and publish **only `dist/`**, not the project folder. Relative asset paths support a project site such as `https://YOUR-NAME.github.io/folio/`. Enable Pages and use the [official Vite GitHub Pages deployment guide](https://vite.dev/guide/static-deploy.html#github-pages) for the build/deploy workflow. The base can instead be set to your repo path (for example `/folio/`) at build time.

Pages can serve the writing UI, saved artifacts and offline design samples. It cannot run the `server/` Vite middleware, so live generation is unavailable on a Pages-only installation. See [GitHub's static-hosting documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

For live AI, use the Vercel deployment above or run the local server. The key-entry control is only offered when Folio detects its backend. A Pages-only site cannot forward AI requests. Never open the development server to the internet or inject a shared key into GitHub Actions build variables. There is no remote-backend URL setting.

No Pages deployment is enabled automatically by this repository.

## Where stories live

Folio uses IndexedDB (`folio-artifacts-v2`) for stories and generated artifacts, plus localStorage for the home preference. Without an account, each visitor has a browser-local workspace—not a folder committed to GitHub or shared cloud storage. Returning to the same origin in the same browser profile normally restores it; another device, browser profile or domain starts separately. Optional accounts synchronize a separate private library. Your browser stories never automatically move into it.

Browser storage can be cleared, private sessions are temporary, and quota/eviction rules vary. It is not a backup. GitHub project paths under one `USERNAME.github.io` origin share browser storage, so independent installations under that same origin should use distinct storage names or separate domains. [MDN explains origins, quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

The info panel offers offline HTML/ZIP publications and complete `.folio` backups with reimport. Keep independent backups of irreplaceable writing, even when cloud saving is enabled. A browser persistent-storage request is not currently implemented.

## Optional accounts and cloud sync

Optional Supabase email-code accounts and private JSONB story storage are implemented. Configure the provider, SQL migration and two public build variables using [accounts and exports](accounts-and-exports.md). IndexedDB remains the immediate local copy; guest stories require explicit import. Revision checks prevent silent device overwrites. HTML/ZIP publication and complete .folio backups are local actions in the existing info panel, never side effects of cloud saving.
