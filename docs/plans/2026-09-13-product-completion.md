# Product Completion Implementation Plan

**Goal:** Implement the Release scope in editor-product-backlog.md, followed by Next, preserving all five compiler contracts.

**Architecture:** Retain source JSON as the authoritative document and keep session state separate. Extract bounded, testable contracts before connecting new controls to the existing editor. Use the bundled schemas and compiler as the authority for persisted fields.

**Tech Stack:** React 19, React Flow 12, Node 22+, Vite 7, Node test runner, Playwright.

---

The user authorized Release and Next on 2026-09-13. Optional remains excluded. Human acceptance (F122, F126, F140, F149) stays open until the appropriate people supply evidence; automated checks cannot close those rows.

## Execution order and evidence

1. F61: establish combined baseline with `npm test`, `npm run build`, `npm run test:browser` in `editor`. Inspect desktop and narrow screenshots. Resolve failures before recording integration closure.
2. F62–F68: inventory `archify/schemas/*.schema.json` against `editor/src/*Panel.jsx` and adapters. Add contract fixtures in `editor/test/product.test.mjs`. Enforce resource boundaries before schema validation in `editor/server.mjs`; document canonical export. Future schemas must preserve original source with blocked unsafe editing.
3. F99, F105, F108–F110, F113–F114: isolate imported identities; preserve independent recovery records; test stale requests, cancellation, conflicts and write failures. Own these contracts in small `editor/src` modules and server/workspace helpers.
4. F70, F78, F83, F87, F91–F94: verify navigation and selection, repeated edges, preview semantics and native authoring across all five types. Extend existing panels only for inventory-confirmed gaps.
5. F115–F116, F119–F125: compiler guidance, export, accessible structure, keyboard workflows, sample entry and contextual help. Preserve the existing dense operating surface, typography and tokens. Render and inspect desktop/narrow layouts.
6. F129, F132, F136–F139: run measured benchmarks and memory audits; test resource/security boundaries; generate dependency and license evidence. Publish measured limits without claiming untested platforms.
7. F141–F148: add reproducible local checks, package/install smoke verification, launch/shutdown handling, compatibility and support documentation. Prepare human acceptance scripts for F122/F126/F140/F149.
8. Next, after engineering Release closure: F65; F69/F71–F77/F79–F82/F84–F86/F88–F90; F95–F98; F100–F104/F106–F107/F111–F112; F117–F118; F127/F130–F131/F133–F135. Split each feature into contract tests, implementation, UI integration, browser verification, and evidence before marking it complete.

For each batch: write behavior tests for the failure/acceptance boundary; run them against the old code; implement; run focused checks; then run the combined release checks when interactions change. Review the diff without disturbing unrelated changes. Do not mark a row complete from a helper function alone.

## Initial baseline

- Working tree was clean. Git inspection uses command-local `safe.directory` because the sandbox account differs from the checkout owner; no global config change.
- All 64 unit tests passed using a workspace-local TEMP/TMP directory. Default Windows temp failed compiler subprocess realpath permissions in this sandbox.
- Build, browser integration and remaining acceptance evidence pending.

## Status

Implementation remains in progress. Completed in this batch: stable import identity; read-only future/unsupported source; validation severity/path alignment; bounded document/render work; stale/cancellable render results; generated five-schema inventory; canonical export/release contract; explicit workflow migration; five starters; searchable help and redacted support bundle; reproducible release checks/package; independently verified clean install/render; overview minimap; temporary visibility and visible selection; overlap cycling/select-visible shortcut; conflict-checked customizable shortcuts; versioned preset and recovery portability. Existing regression evidence covers native type authoring, conflict-safe writes, accessibility, preview rules, lossless round trips and measured label optimization.

Latest automated evidence: 75 Node tests and 71 Playwright tests passed; Vite production build passed; the deterministic 1,000-node benchmark reported 1.095 ms projection, 0.846 ms diagnostics and 12.580 ms for 20 label placements. The extracted `0.1.0` archive clean-installed 40 locked packages and rendered a 715,216-byte architecture HTML file.

Human-owned acceptance F122, F126, F140 and F149 remains pending by definition. Unimplemented Next rows must not be marked complete from this batch.
