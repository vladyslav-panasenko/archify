# Archify Editor local product expansions

Editor 0.2.0 adds the optional product capabilities that can operate entirely on the user's machine. Diagram JSON remains the portable source of truth. Comments, extension grants, installed packs, editor history, and other product metadata stay outside ordinary Archify documents.

Implemented backlog items are F150, F152, F156, F157, F160-F162, F165, and F166. F151 has an unsigned package, checksum manifest, detached-signature verification, and a documented signing handoff; trusted platform identities and final signed-install/update acceptance remain human-owned. Cloud storage, team sharing, live collaboration, enterprise identity, hosted operations, hosted AI, and usage telemetry (F153-F155 and F158-F164 where applicable) are outside this local release.

## Desktop app window

Run from `editor/`:

```powershell
npm run desktop -- --file "D:\Diagrams\system.json"
npm run desktop -- --directory "D:\Diagrams"
```

The launcher starts the existing server on an ephemeral loopback port, creates a temporary Chromium profile, and opens installed Edge, Chrome, or Chromium in app-window mode. The editor server stops and the temporary profile is removed when that browser process exits. `--browser <path>` selects a browser executable and `--no-launch` starts only the owned server for lifecycle tests.

`npm run package:desktop` builds both web editions and creates a versioned unsigned archive, SHA-256 file, and desktop release manifest under `release/`. `desktop/trusted-update.mjs` verifies that an immutable archive matches its manifest and SHA-256 value, then verifies an Ed25519 detached signature over that checksum. A release owner must sign the final immutable archive, publish it through an approved channel, verify install/update/rollback on each supported system, and record the signing identity and result. The repository does not contain a private key or silently install an update.

## Browser-only offline edition

Run `npm run build:offline`, then serve `editor/offline-dist` from a local or static HTTP origin. Open `offline.html` once while the assets are reachable; its service worker caches the edition for later offline reloads. The regular production build also exposes `/offline.html`.

The offline edition can create a starter, import a JSON file, edit through the canvas and JSON view, validate against bundled schema and reference rules, use browser recovery, and download canonical JSON. It has no workspace enumeration or direct filesystem saving, local-server version history, compiler HTML/PNG/PDF rendering, or batch operations. Browser storage can be cleared or evicted, so downloaded JSON is the durable copy. Service workers do not install from `file://`; a local or HTTPS origin is required for installation.

## Comments and saved versions

Comments are local, versioned browser records keyed by document recovery identity. Threads can target the document or a stable item ID, carry replies and resolved state, and remain visible as orphaned threads when an item is deleted. They never enter exported diagram JSON and do not synchronize between browsers or people.

Successful workspace saves and Save As operations record a bounded snapshot in `.archify-editor-history` beneath the selected workspace. The directory is excluded from workspace file listings. The Versions panel lists up to 50 newest entries and can restore a snapshot into the current editor as one validated, undoable change. Restoring does not overwrite the source until the user saves, and the normal source-revision conflict checks still apply. This is local recovery/audit evidence, not an identity-backed or tamper-proof enterprise audit log.

## Mermaid interchange

Interchange supports a selected Mermaid `flowchart` subset for architecture diagrams: `flowchart`/`graph` direction declarations, simple node declarations, and `-->` relationships with optional labels. Imports generate deterministic, collision-safe Archify IDs and positions. Unsupported statements fail explicitly rather than being guessed.

Architecture export emits supported components and connections and shows a loss report before download or copy. Archify-only boundaries, cards, authored routes, label positions, metadata, rich component semantics, ports, and other unsupported fields are reported when they cannot be represented. A Mermaid round trip is therefore a deliberate interchange operation, not a lossless Archify backup.

## Refining regenerated diagrams

The Refinement panel accepts a newly generated Archify document and compares it with the current draft by stable IDs. It can reapply selected manual positions, sizes, connection routes, label positions, and boundary membership. Diagram type and schema version must match, and topology conflicts are reported for review. The candidate is validated before one undoable apply. The editor does not infer live topology or match renamed items semantically.

## Declarative extensions

Extensions are versioned JSON manifests. The editor does not evaluate extension JavaScript. A manifest declares supported diagram types, requested permissions, bounded commands, optional reusable templates, and optional named schema adapters. Users install a manifest locally and grant each requested permission explicitly; grants persist separately from the diagram.

Commands can change only declared document paths, remove declared optional values, insert validated templates, or call an adapter registered by the host. Inputs and outputs are cloned, manifest and operation sizes are bounded, prototype-pollution paths are rejected, and the final document is validated before one apply. Removing an extension also removes its grant. This API provides local failure isolation but is not a process or operating-system sandbox for future executable plugins.

## Domain packs

The bundled Software delivery, Data platform, and Incident response packs provide validated starters or reusable structures across the five diagram types, terminology, and one bounded accent theme token. Imported pack manifests use the same version, size, structure, diagram-type, and duplicate-ID checks. Duplicate pack IDs require explicit replacement. Applying a starter or inserting a template validates the resulting document and creates one editor transaction. Pack selection and theme state stay local; only explicit starter/template content becomes diagram JSON.

## Architecture schema v2 ports

Architecture v2 adds explicit persisted component ports and connection endpoint references:

```json
{
  "id": "api",
  "type": "backend",
  "label": "API",
  "ports": [{ "id": "public", "side": "right", "offset": 0.5 }]
}
```

A connection may use `fromPort` and `toPort`, and each referenced port must belong to its corresponding endpoint component. Offsets are normalized from 0 to 1. Duplicate ports, missing ports, and wrong-owner references fail validation or rendering. The compiler places endpoints at the authored side and exact offset and renders port markers deterministically.

Architecture v1 remains valid. Port fields are rejected in v1, and opening or saving never upgrades a document implicitly. The Ports panel previews an explicit v1-to-v2 migration that changes only `schema_version`; it adds no guessed ports. Removing a port explicitly clears connection references to it so the document remains valid.

## Verification

The local expansion contracts live in `editor/test/local-expansions.test.mjs`, server history coverage in `editor/test/workspace.test.mjs`, compiler port coverage in `archify/test/architecture-ports.test.mjs`, and browser workflows in `editor/test/browser/local-expansions.spec.mjs`. Use the release commands in [editor-release.md](editor-release.md) to reproduce the complete result.
