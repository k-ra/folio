# Public release QA · 17 September 2026

- 82 unit tests passed; 91 offline browser tests passed against the production bundle.
- `npm run build -- --base=./` passed.
- A separate static server mounted the build at `/folio/`: writing saved across reload, all four image references loaded, and no browser runtime errors occurred. This verifies path handling, not an actual GitHub Pages deployment.
- Desktop, tablet and narrow-mobile library and image-panel screenshots inspected. A short library now retains the full scroll distance required to finish the stack transition; the tablet regression is covered by the existing library test.
- Generation contract tests verify actual reference-image bytes, short directions, legacy recognition, current-artifact separation, custom directions, and no preset-image input for graphics/data. No live provider requests were made.
- Public source and production output checked for original personal writing, sensitive sample notes, credentials and machine paths. Only generated style-reference WebPs are bundled as image assets. Original design handoffs, workspace data, local references, personal images and earlier Git history are not part of this release.
- A new repository history is used. No license file was added.

These checks describe the initial public snapshot. Vercel/BYOK was added afterward; see [deployment QA](qa-vercel.md) and [hosting](hosting.md). Static-only hosting still has no live AI backend, and cloud sync remains unimplemented.
