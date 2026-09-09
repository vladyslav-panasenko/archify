# Editor Reliability and Workspace Implementation Plan

**Goal:** Deliver F29–F36 with separate tested commits and pushes.

**Architecture:** Keep immutable JSON operations separate from canvas and local UI state. Reuse existing validators, adapters, revision checks and history. Workspace paths are authorized only by an explicit startup directory; templates and preferences remain local.

**Tech Stack:** React, React Flow, Node.js, Archify schemas/renderers, Playwright.

---

| Feature | Files                                                                                           | Verification                                                                         |
| ------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| F29     | `editor/src/document.mjs`, adapters, `editor/test/hardening.test.mjs`, `docs/editor-quality.md` | Invalid shapes/references, finite geometry, all types, 200 edits and undo/redo       |
| F30     | `editor/src/main.jsx`, `editor/src/document.mjs`, `editor/scripts/benchmark.mjs`                | Before/after timings for 500 nodes; browser drag and selection; actual render timing |
| F31     | `editor/src/auto-layout.mjs`, `editor/src/AutoLayoutPanel.jsx`                                  | Determinism, cycles, locked nodes, preview/cancel/apply, undo                        |
| F32     | `editor/src/templates.mjs`, `editor/src/TemplatesPanel.jsx`                                     | ID remapping, storage limits, import/export, browser insertion                       |
| F33     | `editor/src/json-source.mjs`, `editor/src/JsonEditor.jsx`                                       | Schema suggestions, located errors, source/canvas navigation, unapplied text         |
| F34     | `editor/workspace.mjs`, server/main, `editor/src/WorkspacePanel.jsx`                            | Traversal/symlinks, separate revisions, drafts/history on switch, safe save          |
| F35     | `editor/src/layout-comparison.mjs`, `editor/src/ComparePanel.jsx`                               | Stable IDs, ghost positions, chosen placement fields only, undo                      |
| F36     | UI components/styles and browser accessibility tests                                            | Keyboard flow, focus visibility, control names/targets, desktop/narrow screenshots   |

For each feature: add meaningful tests; implement; run `npm test`, `npm run build` and relevant browser cases; inspect rendered changes; update the backlog; commit and push. Finish with the full browser suite and a concise usage guide update. Do not add runtime dependencies without a demonstrated need.

Delivery: F29–F36 are implemented and pushed. See the feature backlog for commit IDs and editor-quality.md for verification and scope limits.
