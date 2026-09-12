# Editor Workflow Implementation Plan

**Goal:** Complete F53–F60 with tracked per-feature commits and pushes.

**Architecture:** Extend immutable transformations and reuse canvas previews, history and validation. Keep local preferences and recovery metadata outside exported JSON. Preserve established canvas/inspector controls and add keyboard access.

**Tech Stack:** React, React Flow, Node test runner, Playwright and Archify validators.

---

1. F60: Audit `editor/src/main.jsx` gesture cancellation, pending operations and document load boundaries. Add tests to `editor/test/browser/workflow.spec.mjs`; invalidate gesture references on load and guard switching. Run browser checks, track, commit, push.
2. F53: Add `InlineLabel.jsx` for node-local input. Use existing `patchComponent` and history through the editing context, validate nonempty labels, disable gestures during editing. Test Enter/Escape/locks and schema preservation. Track, commit, push.
3. F54: Add `ContextActions.jsx`, native dialog with mouse anchor and keyboard invocation. Reuse selection helpers and supported actions; guard destructive actions and locks. Test focus/escape/duplicate/undo. Track, commit, push.
4. F55: Add `PanelControls.jsx` and local bounded preferences. Support focus toggle and width controls, CSS desktop columns and narrow fallback. Test persistence and overflow. Track, commit, push.
5. F56: Add `insert-connection.mjs` and preview panel. Preserve original edge identity/metadata on incoming half, fresh outgoing identity, explicitly reset geometry overrides. Validate candidate, reuse preview guard and history. Test topology/metadata/cancel/apply/undo. Track, commit, push.
6. F57: Add overlap solver to `arrangement.mjs` and option in AutoLayoutPanel. Only move unlocked selected nodes, deterministic candidate translations with a bounded search and explicit failure. Verify fixed items and absence of overlaps. Track, commit, push.
7. F58: Add `layout-presets.mjs` and panel; bound local storage and validate fields. Lift layout settings to app for AutoLayoutPanel and existing snapping controls. Test invalid/overflow storage, apply and unchanged JSON. Track, commit, push.
8. F59: Add `recovery-history.mjs`, serialize bounded adjacent snapshots into current recovery format; validate restored snapshots and gracefully fall back to draft-only. Test redo/divergence/legacy/oversize/source-changed behavior. Track, commit, push.

For every implementation: focused Node/browser checks and build where UI changes. Finish full Node/build/browser suite, inspect desktop/narrow screenshots, update usage and delivery docs, format and run git diff --check. Preserve current authorized main-branch workflow; no additional dependencies planned.
