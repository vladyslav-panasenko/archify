# Local Product Expansions Implementation Plan

**Goal:** Deliver every optional Archify Editor expansion that operates locally, while leaving hosted storage, multi-user collaboration, enterprise identity, hosted AI, telemetry, signing credentials, and human acceptance outside this implementation.

**Architecture:** Keep Archify JSON deterministic and compiler-owned. Add local product capabilities as isolated modules: a Chromium app-window launcher, a static offline mode, browser-local review records, confined server-side history, explicit Mermaid interchange, stable-ID refinement proposals, declarative sandboxed extensions, bundled diagram packs, and an opt-in architecture v2 port contract. Local metadata stays outside diagram JSON unless it is an explicit versioned schema capability.

**Tech Stack:** Node.js 22, React 19, Vite, Playwright, JSON Schema/Ajv standalone validators, Chromium app mode, browser storage, Node filesystem APIs.

---

### Task 1: Freeze scope and acceptance contracts

**Files:**
- Create: `docs/editor-local-expansions.md`
- Test: `editor/test/local-expansions.test.mjs`

1. Add failing contract tests for comment subject stability, bounded audit history, Mermaid loss reports, stable-ID override reapplication, extension permissions/timeouts, pack validation, and architecture v2 ports.
2. Document included and excluded backlog IDs and the rule that local metadata never enters ordinary diagram JSON.
3. Run `node --test test/local-expansions.test.mjs`; expect the missing-module failures.

### Task 2: Add local comments and version history

**Files:**
- Create: `editor/src/comments.mjs`
- Create: `editor/src/CommentsPanel.jsx`
- Create: `editor/src/server-history.mjs`
- Create: `editor/src/VersionHistoryPanel.jsx`
- Modify: `editor/server.mjs`
- Modify: `editor/src/main.jsx`
- Modify: `editor/src/EditorNavigation.jsx`

1. Store versioned, size-bounded comment threads in browser storage keyed by recovery identity and stable subject ID.
2. Mark comments orphaned when their subject disappears; retain and expose them for review instead of mutating diagram JSON.
3. Record successful direct saves and Save As operations in a confined `.archify-editor-history` workspace directory with revision, timestamp, operation, file ID, and restorable JSON snapshot.
4. Add list/restore endpoints protected by the editor token and source-revision checks.
5. Add Comments and Versions panels and verify each restore is one undoable editor transaction.

### Task 3: Add selected external interchange and refinement

**Files:**
- Create: `editor/src/mermaid-interchange.mjs`
- Create: `editor/src/InterchangePanel.jsx`
- Create: `editor/src/refinement.mjs`
- Create: `editor/src/RefinementPanel.jsx`
- Modify: `editor/src/main.jsx`
- Modify: `editor/src/EditorNavigation.jsx`

1. Import the documented Mermaid `flowchart` subset into architecture JSON with deterministic IDs and positions.
2. Export supported architecture nodes and edges to Mermaid and return an explicit loss report for boundaries, cards, routes, labels, metadata, and unsupported node semantics.
3. Compare regenerated and current documents by stable ID; offer explicit position, size, route, label-placement, and boundary-membership overrides.
4. Reject type/version/topology mismatches, preview the result, validate it, and apply once through shared editing transactions.

### Task 4: Add a permission-scoped declarative extension API

**Files:**
- Create: `editor/src/extensions.mjs`
- Create: `editor/src/ExtensionsPanel.jsx`
- Modify: `editor/src/main.jsx`
- Modify: `editor/src/EditorNavigation.jsx`

1. Define a versioned JSON manifest with IDs, supported diagram types, requested permissions, and bounded declarative commands.
2. Support commands that set/remove allowed document paths, add validated templates, or invoke registered schema adapters; do not evaluate extension JavaScript.
3. Require explicit permission grants, clone input/output, enforce size and operation limits, catch failures, validate output, and commit once.
4. Persist manifests and grants locally outside diagram JSON, with export/remove controls and compatibility errors.

### Task 5: Add domain-specific diagram packs

**Files:**
- Create: `editor/src/diagram-packs.mjs`
- Create: `editor/src/DiagramPacksPanel.jsx`
- Create: `editor/packs/software-delivery.json`
- Create: `editor/packs/data-platform.json`
- Create: `editor/packs/incident-response.json`
- Modify: `editor/src/main.jsx`
- Modify: `editor/src/EditorNavigation.jsx`

1. Define a versioned pack manifest containing validated starters, reusable fragments, terminology, and UI theme tokens.
2. Bundle three local packs spanning all five diagram types without changing their JSON contracts.
3. Add local import/export, size bounds, duplicate replacement, preview, and explicit starter/template insertion.

### Task 6: Add architecture v2 persisted ports

**Files:**
- Modify: `archify/schemas/architecture.schema.json`
- Modify: `archify/renderers/architecture/render-architecture.mjs`
- Modify: `archify/renderers/shared/generated-validators.mjs`
- Create: `editor/src/architecture-migration.mjs`
- Modify: `editor/src/MigrationPanel.jsx`
- Modify: `editor/src/document.mjs`
- Test: `archify/test/architecture-ports.test.mjs`

1. Add architecture schema version 2 with component `ports` and connection `fromPort`/`toPort` fields, bounded IDs, side, and normalized offset.
2. Keep v1 valid and reject port fields until explicit migration changes `schema_version` to 2.
3. Resolve authored ports deterministically in the renderer; reject missing, duplicate, or wrong-component references.
4. Add a v1-to-v2 preview that preserves the original and adds no ports implicitly.
5. Expose port creation, endpoint selection, and removal in the architecture inspector with reference-safe cleanup.

### Task 7: Add browser-only offline edition

**Files:**
- Create: `editor/src/runtime.mjs`
- Create: `editor/public/offline-config.js`
- Create: `editor/scripts/build-offline.mjs`
- Modify: `editor/src/main.jsx`
- Modify: `editor/vite.config.mjs`
- Modify: `editor/package.json`

1. Abstract document open, validation, save/download, workspace availability, and compiler availability behind a runtime adapter.
2. Build a static offline entry with a bundled starter, local JSON validation, file import/download, browser recovery, and installable service-worker assets.
3. Disable server-only workspace, direct-save, batch, audit, and HTML compiler controls with visible reasons.
4. Verify reload without a server after the first load and document browser storage/export limits.

### Task 8: Add desktop app-window launch and unsigned packaging

**Files:**
- Create: `editor/desktop/launcher.mjs`
- Create: `editor/desktop/installers.mjs`
- Create: `editor/scripts/package-desktop.mjs`
- Modify: `editor/package.json`
- Modify: `editor/scripts/package-release.mjs`

1. Start the existing loopback server on an ephemeral port and launch Edge or Chrome in a dedicated app window.
2. Forward file/workspace arguments, propagate startup errors, close the server with the window, and handle SIGINT/SIGTERM.
3. Package platform launch scripts, checksum manifests, upgrade/rollback instructions, and optional external signing hooks.
4. Verify unsigned packages locally. Keep signing identities, trusted publication accounts, and signed-update acceptance human-owned.

### Task 9: Integrate, document, and verify

**Files:**
- Modify: `editor/README.md`
- Modify: `docs/editor-product-backlog.md`
- Modify: `docs/editor-features.md`
- Modify: `docs/editor-release.md`
- Modify: `docs/plans/2026-09-14-local-product-expansions.md`

1. Run focused Node tests after each module, regenerate validators, and run renderer tests for schema changes.
2. Add Playwright coverage for comments, history, interchange, refinement, extensions, packs, ports, and offline limitations.
3. Run `npm run check:release:browser`, offline build/smoke, desktop package smoke, and `git diff --check`.
4. Record exact results and leave F151 signing plus the existing human acceptance gates open.

## Status

Implemented on 2026-09-15 for editor 0.2.0. Delivered F150, F152, F156, F157, F160-F162, F165, and F166. The F151 engineering handoff includes an unsigned reproducible archive, SHA-256 manifest, and Ed25519 detached-signature verifier; signing identities, trusted publication, and signed install/update/rollback acceptance remain human-owned. Cloud-backed F153-F155, F158-F159, F163, and F164 were intentionally excluded.

Verification evidence:

- Editor release gate: 96 Node tests passed, both production builds passed, capability inventory regenerated, and the 1,000-node benchmark remained within the documented budget.
- Browser suite: 76 tests passed in the combined run; the two timed-out workspace cases were rerun individually. Save As passed unchanged, and source reload passed after fixing a dropped focus-check race and adding its unit regression. This accounts for all 78 browser workflows. The offline case also passed a real browser reload after network access was disabled.
- Compiler: generated validators were current, golden renders passed, and the focused architecture/schema policy suite passed 6/6. The repository-wide compiler command still reports unrelated failures already present on `origin/main`, including divergent localized README release fixtures; sandboxed Git ownership also prevents several Git-fixture checks in this environment.
- Packaging: `archify-local-editor-0.2.0.tgz`, 1,582,217 bytes, 179 files, SHA-256 `6F539D41B134686DD6A11215B36294B1B074424B255AF884687665C8B4EB2653`. The checksum was independently recomputed and matched the desktop manifest.
