# Editor Authoring Implementation Plan

**Goal:** Implement F11–F28 from the editor backlog, with a tested commit and push for each feature.

**Architecture:** Immutable operations patch the original JSON through schema-aware adapters. React controls invoke those operations through the existing history and validation flow. Local preferences, snapshots and navigation state stay outside exported JSON.

**Tech Stack:** React, React Flow, Node.js, Archify validators and renderers, Playwright.

---

## Delivery sequence

| Feature | Implementation files | Verification |
| --- | --- | --- |
| F11 | `editor/src/arrangement.mjs`, `editor/src/main.jsx` | Edge/center alignment, equal gaps, preservation, one-step undo |
| F12 | `editor/src/arrangement.mjs`, `editor/src/main.jsx`, `editor/src/style.css` | Drag/resize snapping, guides, bypass, cancellation |
| F13 | `editor/src/clipboard.mjs`, `editor/src/main.jsx` | ID remapping, unknown fields, type rejection, browser paste |
| F14 | `editor/src/document.mjs`, `editor/src/main.jsx` | Mouse connection creation/reconnection and preservation |
| F15 | `editor/src/selection.mjs`, `editor/src/main.jsx` | Mixed properties, reference cleanup, minimum nodes, undo |
| F16 | `editor/src/main.jsx` | Locked drag/resize/nudge, local persistence and unlock |
| F17 | `editor/src/selection.mjs`, `editor/src/main.jsx` | Reset only optional placement fields, schema validity |
| F18 | `editor/src/structure.mjs`, `editor/src/StructurePanel.jsx` | Boundary membership, movement and deletion |
| F19 | `editor/src/topology.mjs`, `editor/src/StructurePanel.jsx`, `editor/src/main.jsx` | Workflow versions, lane/node/edge operations, renderer |
| F20 | Same topology and structure files | Stage/node/flow operations, references, renderer |
| F21 | Same topology and structure files | Lifecycle lanes/states/transitions, renderer |
| F22 | Same topology and structure files | Sequence messages, participants, activation/segment ranges, renderer |
| F23 | `editor/src/SettingsPanel.jsx`, `editor/src/main.jsx` | Supported settings, unknown metadata and renderer |
| F24 | `editor/src/main.jsx` | Keyboard search, connections, fit selection, JSON unchanged |
| F25 | `editor/src/review.mjs`, `editor/src/ReviewPanel.jsx` | Field-level diff and save/download baseline |
| F26 | Same review files, `editor/server.mjs`, `editor/src/main.jsx` | Three-way conflicts, explicit resolution, revision race |
| F27 | `editor/src/CheckpointsPanel.jsx`, `editor/src/main.jsx` | Storage limits, restore/undo, export, source unchanged |
| F28 | Structure files | Views, focus references, topology cleanup, renderer |

## Per-feature procedure

1. Add focused data tests in `editor/test/authoring.test.mjs` (or the matching existing test file) and browser coverage in `editor/test/browser/authoring.spec.mjs`.
2. Implement the operation and controls; reuse history, error reporting and schema validation.
3. Run `npm test`, `npm run build`, and the relevant Playwright cases from `editor/`. Expect every check to pass. Run renderer checks when a feature changes schema structure.
4. Inspect new controls at desktop and narrow widths. Preserve keyboard operation and cancellation.
5. Mark the feature implemented in `docs/editor-features.md`, commit its files, and push `main`. Do not combine later feature code into its commit.
6. At the end, run the full browser suite and document any type-specific limits in `editor/README.md`.
