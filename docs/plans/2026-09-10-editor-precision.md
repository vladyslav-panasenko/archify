# Editor Precision and Reliability Implementation Plan

**Goal:** Complete F45–F52 with JSON-preserving manual refinement and reliability improvements.

**Architecture:** Extend existing immutable transformations and React Flow controls. Keep previews and file notifications outside source JSON; reuse revision-aware merge and history. Preserve the current compact toolbar/canvas/inspector design and keyboard access.

**Tech Stack:** React, React Flow, Node.js, JSON schemas, Node test runner, Playwright.

---

Use the authorized current checkout and one commit/push per feature. No new dependencies are planned.

## F45 — Guides
Files: editor/src/arrangement.mjs, editor/src/main.jsx, editor/test/precision.test.mjs, editor/test/browser/precision.spec.mjs.
1. Test close versus remote spacing neighbors, multi-selection offsets, Alt bypass and screen-pixel tolerance.
2. Filter equal-spacing neighbors by perpendicular overlap, annotate edge/center matches, pass threshold `6 / zoom` for gestures.
3. Run focused Node/browser tests, update backlog, commit and push.

## F46 — Attachments
Files: editor/src/AttachmentControls.jsx, editor/src/main.jsx, precision tests.
1. Test side updates preserve edge metadata and endpoints.
2. Show compact source/target side selectors for the selected architecture connection on the canvas. Use existing immutable patch/history and global edit guards.
3. Verify mouse/keyboard, undo, build; update backlog, commit and push.

## F47 — Routes
Files: editor/src/segments.mjs, editor/src/RouteTools.jsx, editor/src/main.jsx, precision tests.
1. Test duplicate/collinear waypoint reduction including backtracking, empty routes and metadata.
2. Add simplify/straighten preview using the existing full-canvas preview state; cancel restores the source, apply makes one commit.
3. Verify browser preview/cancel/apply/undo; update backlog, commit and push.

## F48 — Boundaries
Files: editor/src/structure.mjs, editor/src/StructurePanel.jsx, precision tests.
1. Test computed member bounds and padding, reject invalid padding/missing members.
2. Add explicit fit controls and dimensions; write only wraps/pad supported by Archify. Existing automatic sizing remains the source geometry contract.
3. Verify visible dimensions and undo, update backlog, commit and push.

## F49 — Partial layout
Files: editor/src/auto-layout.mjs, editor/src/AutoLayoutPanel.jsx, precision tests.
1. Test connected fixed anchors in both directions and locked selections, cycles and disconnected selections.
2. Add anchored mode with deterministic placement relative to direct fixed neighbors and obstacle avoidance. Reuse preview/apply/cancel.
3. Verify integration, update backlog, commit and push.

## F50 — External changes
Files: editor/src/source-watch.mjs, editor/src/main.jsx, editor/test/browser/workspace.spec.mjs.
1. Test revision response races, file switches and read failures.
2. Poll while writable document is open and refresh on focus, abort on cleanup; show notice only for changed revisions. Offer merge and guarded reload with explicit draft handling; never overwrite raw text automatically.
3. Test external disk modification and preserved local edits, update backlog, commit and push.

## F51 — Performance
Files: editor/bench/large-diagram.mjs, editor/src/document.mjs, editor/src/main.jsx, editor/package.json, performance tests/docs.
1. Build deterministic 100/500/1000-node fixtures with realistic sparse connections and measure projection, diagnostics, move and history cost.
2. Optimize measured bottlenecks with equivalent-output assertions; avoid per-edge scans where a shared index suffices.
3. Record before/after measurements and browser large-document behavior, update backlog, commit and push.

## F52 — Round trips
Files: editor/test/roundtrip.test.mjs and relevant existing fixture/helper files.
1. Use real schema-valid examples for each adapter; apply movement, property/route edits supported by that adapter and topology operations.
2. Assert serialize/reopen equality, source immutability, untouched metadata/edge fields, valid output and undo/redo restoration.
3. Run complete Node/build/browser checks, review desktop/narrow screenshots, update backlog and usage docs, commit and push.

## Final delivery
Run git diff --check, verify clean synchronized main, record exact feature commits and checks. Do not leave a background app server running.
