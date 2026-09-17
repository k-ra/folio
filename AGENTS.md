# Working on Folio

This is the clean public codebase. Keep personal essays, workspace exports, original private design handoffs, credentials and private Git history out of this repository. Public demos must be neutral original examples or explicitly sourced public data.

Read `README.md` for the overview, `docs/development.md` for project setup and QA, and `docs/design-rules.md` before UI changes.

Treat the workshop grid as a shared contract: page controls share a sheet-relative rail; the writing column has equal gutters; margin controls anchor to their blocks. Reuse the existing grid tracks, `.rail-control`, and layout variables instead of adding component-specific offsets or duplicating sidebar-width calculations.

Preserve user content and unrelated work. Keep browser QA offline through `tests/browser/fixtures.ts`; live generation requires an explicitly scoped check. For layout changes, run the rail, centering, orbs and relevant interaction tests, inspect desktop/mobile output, and run the build.
