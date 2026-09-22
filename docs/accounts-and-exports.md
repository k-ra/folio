# Accounts, saving, and portable stories

## Backend choice

Supabase Auth + Postgres is the smallest deployment for Folio's existing model: one service, no custom auth server, one private JSONB row per complete story. Paragraphs, notes, chats, presets, image data URLs, generated code, attachments, artifact revisions and story history commit together. Media is currently stored inline in the structured story; this avoids dangling uploads or partially saved stories. It trades storage/bandwidth efficiency for atomicity. Large image-heavy histories may need a later content-addressed object store; they are not silently truncated. Provider request/storage limits can still reject a save, leaving the local copy and exports available.

The client authenticates directly with Supabase. No Supabase admin/service-role credential belongs in Vercel or the browser. Row-level security filters reads by `auth.uid()`. Direct table writes are revoked; a narrowly scoped security-definer RPC derives the owner from the verified auth session and atomically checks the expected revision before writing. Deletions retain a revisioned tombstone. A stale device cannot overwrite or resurrect a newer record. This is not collaborative editing or automatic merging.

## Manual deployment setup — required before accounts work

1. Create a Supabase project in your chosen region. Choose and approve its plan/billing yourself; Folio does not create a project, subscribe to a plan, or incur provider charges on your behalf. Review database, payload, email, backup retention and egress limits for your intended use. Configure backups appropriate to that use.
2. Run `supabase/migrations/202609210001_stories.sql` once in the project's SQL editor. Do not grant clients direct INSERT/UPDATE/DELETE privileges.
3. Enable **Email** in Authentication providers. In the **Magic Link** email template, use the OTP variable `{{ .Token }}` as the sign-in code; the interface verifies an email code, not a redirect link. Configure your own SMTP delivery for real visitors and test delivery/rate limits. Keep sign-up enabled if you want visitors to create accounts. Set the project's Site URL to your deployed Folio URL.
4. In Vercel → project → Settings → Environment Variables, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project's connection settings. A legacy public anon key also works. **Never use a secret/service-role key.** Set the same two values in local `.env.local` for development. These are build-time public settings; redeploy after changing them.
5. Deploy the normal Vite build. Existing Vercel AI routes remain BYOK and separate. Static GitHub Pages hosting can also use Supabase directly; the cloud account connection does not require Vercel functions. Hosted AI still requires its existing backend.
6. Before announcing availability: create two real test accounts, confirm code delivery, import a disposable story explicitly, reopen it on a second device, exercise offline edits/reconnect/conflict handling, and verify the Supabase table shows only each user's own rows through the public client. This real-provider deployment check is still required; offline mocks do not verify your project's configuration or email delivery.

Without these settings the editor remains local-only and homepage settings explain that cloud accounts are unconfigured.

## Saving and account boundaries

- Browser edits are saved immediately through IndexedDB, independently of cloud availability. Status says **SAVED LOCALLY**, **CLOUD PENDING**, **CLOUD SAVED**, **CLOUD ERROR**, or **CLOUD CONFLICT**; a local failure is explicit. Cloud success means the server acknowledged the current snapshot, not just that an upload started.
- Each account has a separate local cache and sync checkpoint. Signing out returns to the original browser library. This is logical separation, not encryption against someone with access to your browser profile. Sign out on shared devices; use a separate browser profile for stronger local privacy.
- First sign-in opens the account's cloud library without uploading guest stories. Homepage settings offer **Import browser stories to my account**. This is explicit consent to upload complete stories, including private notes and history. It copies rather than moves. IDs deduplicate imports; repeat imports skip existing cloud IDs, even if their browser originals later change. A partially completed import can safely be retried.
- Background retries run after edits, reconnection/window focus and every 15 seconds. A failed upload never clears the local copy. A lost acknowledgement is reconciled by content fingerprint. Cloud downloads replace only unchanged local snapshots; typing during a fetch is protected.
- Conflicts are surfaced in save status and homepage account settings. **Keep both copies** retains the device version as a new story and the remote version separately (or retains the device copy separately when the remote was deleted). There is no silent last-writer-wins or automatic text merge.
- AI credentials stay in the existing tab-memory connection state. Auth tokens are managed separately by Supabase Auth. Neither is part of story data, cloud payloads, or portable files. `.folio` import uses an allowlisted schema, including history snapshots.

## Portable output

Copy and download are inside the existing info/history panel. Download reveals HTML and .folio inline. Account/import controls live in homepage settings. No new page-level controls are added.

- **Copy text** copies the title, text/fancy blocks and visible captions in order with paragraph breaks; excludes private notes, prompts and chats.
- **Download HTML** is the primary publication. It is generated from structured data and includes an embedded reading runtime, fonts, styles, media data URLs and the active graphics. It reuses the editor's chart, sandbox and background renderers. It runs without Folio, a login, a successful cloud save or a network connection. A static readable document is also present before scripts run. No source history, prompts, chats or dormant artifact revisions are serialized. Margin notes are opt-in.
- **HTML** automatically downloads a ZIP when published images or datasets are present, with `index.html`, `assets/` and/or `datasets/`; extract and keep them together. Otherwise it downloads a single HTML file. Fonts and executable code stay inline. Only attachments of finished data artifacts are included, not private chat attachments or unsent prompts.
- **Download .folio backup** retains the complete structured story and embedded media, including notes, chats and history, for reimport. Keep it private. Importing an identical current backup opens the existing story; importing a changed story with the same ID creates a separate copy rather than replacing anything. Import limit: 200 MB.
- Local assets export without network access. Publication attempts to embed published remote images with credential-free requests and a timeout; unavailable images and external resources inside custom code are explicitly disclosed. Arbitrary scripts or private chat references are never fetched. Sandboxed generated graphics still cannot fetch external resources; their dependencies must already be self-contained to work offline. Source links remain ordinary outbound citations. `.folio` retains external URLs as references, not as magically recovered files.

The inline reader/fonts intentionally increase the main application bundle so an export works even when the network disappears before the first download. No on-demand export chunk needs fetching.

## Verification

`npm test` covers full backup round trips, publication privacy, asset ZIPs, paragraph note preservation, failure/retry, lost acknowledgements, stale-device conflicts and tombstones. The SQL migration is executed in embedded Postgres (PGlite), testing account isolation, direct-write denial, anonymous denial, revision checks and duplicate import protection.

`FOLIO_QA_PREVIEW=1 npm run test:e2e` covers multi-paragraph merge/undo, the hover note control, latest-edit exports without a network, interactive HTML opened from a local file, .folio reimport, and existing grid/layout regression tests. All API calls are offline fixtures.

For the account UI/transport integration mock (never use these fake settings in production):

```sh
VITE_SUPABASE_URL=https://folio-qa.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=qa-public-key npm run build
FOLIO_QA_CLOUD=1 FOLIO_QA_PREVIEW=1 npm run test:e2e -- tests/browser/cloudAccounts.spec.ts
npm run build
```

The last build restores the real configured/local-only deployment output. Browser fixtures block Supabase network access unless a test explicitly supplies a mock response. No live AI generation is part of QA.
