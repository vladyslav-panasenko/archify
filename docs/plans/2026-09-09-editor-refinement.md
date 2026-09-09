# Editor Refinement Implementation Plan

**Goal:** Deliver F37–F44 as individually tested and pushed features.

**Architecture:** Immutable document operations remain separate from canvas/session state. Reuse the existing gesture lifecycle, adapters, compiler diagnostics, file revisions and bounded history. Extend only schema-supported geometry; all file access stays below the explicitly opened directory.

**Tech Stack:** React, React Flow, Vite, Node.js, Archify validators/renderers, Node test runner and Playwright.

---

The existing clean `main` checkout is the authorized delivery workspace. No new dependency is planned. UI direction: preserve the quiet canvas and existing controls; expose preview/selection state clearly and reduce navigation friction.

## F37: Full-canvas preview

Files: `editor/src/main.jsx`, `editor/src/AutoLayoutPanel.jsx`, `editor/test/browser/refinement.spec.mjs`.

1. Add a browser test proving proposed node positions appear before Apply; Cancel/Escape restores positions and Apply is one undo step.
2. Run `npm run test:browser -- refinement.spec.mjs`; expect missing preview behavior.
3. Store `{base, document}` outside history; project the preview while disabling authoring, saving and document switching. Keep pan/zoom available. Apply calls `change(preview.document)` once; Cancel clears the preview.
4. Build and run the focused browser test plus existing auto-arrange regression.
5. Mark the backlog, commit F37 and push `origin main`.

## F38: Directed layout

Files: `editor/src/auto-layout.mjs`, `editor/src/AutoLayoutPanel.jsx`, `editor/test/refinement.test.mjs`.

1. Test chains, branches, cycles, stable ordering, both directions, spacing and locked obstacles.
2. Run `node --test test/refinement.test.mjs`; expect directed options to be unsupported.
3. Condense strongly connected nodes, rank the DAG and order layers by neighbor positions; place boxes with bounded obstacle avoidance. Preserve connections verbatim. Expose `mode`, `direction`, `gap` controls before preview.
4. Run Node tests, build and browser preview cases; inspect the resulting layout.
5. Mark, commit F38 and push.

## F39: Segment editing

Files: `editor/src/segments.mjs`, `editor/src/main.jsx`, refinement tests.

1. Test finite orthogonal consecutive waypoints, endpoint preservation, perpendicular motion, Escape and single undo.
2. Add `routeSegments(edge)` and `moveSegment(document,index,segment,point)`; reject diagonals/zero-length segments and preserve all unrelated fields.
3. Reuse `DragPoint` for midpoint handles and keyboard alternatives on architecture routes with authored waypoints.
4. Run operation tests, browser gestures and existing waypoint/reconnection cases.
5. Mark, commit F39 and push.

## F40: Problems

Files: `editor/src/problems.mjs`, `editor/src/ProblemsPanel.jsx`, `editor/src/main.jsx`, refinement tests.

1. Test structured overlaps/bounds and compiler identity/path resolution, including unmapped issues.
2. Compute stable issue keys and node/edge references; keep compiler result snapshot separate to show stale status. Navigation selects and fits affected items; unresolved issues still expose JSON/diagnostic text.
3. Add previous/next issue controls and a canvas outline for the active problem.
4. Run Node/browser tests and inspect visible highlights.
5. Mark, commit F40 and push.

## F41: Navigation and commands

Files: `editor/src/EditorNavigation.jsx`, `editor/src/CommandMenu.jsx`, `editor/src/main.jsx`, refinement tests.

1. Test panel groups, Ctrl/Cmd+K search, Enter selection, Escape focus restoration and disabled commands.
2. Use native buttons/details and a modal dialog; share panel/action definitions instead of duplicating action implementations. Keep every existing panel reachable and tests using panel names compatible.
3. Run browser regressions and desktop/narrow visual checks.
4. Mark, commit F41 and push.

## F42: Workspace Save As

Files: `editor/workspace.mjs`, `editor/server.mjs`, `editor/src/SaveAsPanel.jsx`, `editor/src/main.jsx`, server/browser tests.

1. Test valid new/copy files, missing directories, traversal/absolute paths, symlink parents, duplicate names, explicit replacement and stale revision.
2. Add a token-protected JSON endpoint with a confined relative `.json` path. Use exclusive creation for new files and existing atomic revision-checked replacement for explicit overwrite. Return a complete new file session.
3. Provide filename and conflict/revision UI, keep prior file drafts intact and switch to the created copy after success.
4. Run server tests, build and browser creation/copy/save checks.
5. Mark, commit F42 and push.

## F43: Document views

Files: `editor/src/document-view.mjs`, `editor/src/main.jsx`, refinement tests.

1. Test malformed storage, finite viewport limits, stale selection IDs and safe panel restoration.
2. Save `{viewport, selection, panel}` under stable document context, with a bounded map and no geometry writes. Capture pan/zoom end and restore after initial canvas measurement; session drafts take precedence over persisted defaults.
3. Test switch/reload, per-file isolation and raw-text recovery.
4. Mark, commit F43 and push.

## F44: History

Files: `editor/src/history-labels.mjs`, `editor/src/HistoryPanel.jsx`, `editor/src/document.mjs`, `editor/src/main.jsx`, refinement tests.

1. Test readable before/after summaries, no-op commits, bounded history, jump backward/forward and divergent edits.
2. Derive descriptions from adjacent immutable snapshots; jump by repeated existing undo/redo operations, preserving future states. Block jumps while text/gestures/previews are pending.
3. Test browser history navigation and normal keyboard undo/redo.
4. Mark, commit F44 and push.

## Integration

Run `npm test`, `npm run build`, `npm run test:browser`, inspect desktop/narrow screenshots, and run `git diff --check`. Update usage docs and delivery IDs. Push final documentation/formatting cleanup and verify a clean synchronized checkout. Report measured checks and remaining scope limits accurately.
