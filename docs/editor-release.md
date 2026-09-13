# Archify Editor release contract

## Supported local platform

The editor supports Node.js 22.12 or newer on Windows 11, macOS 14+, and maintained 64-bit Linux distributions, using a current stable Chromium-family browser. The checked release combination on 2026-09-13 is Windows 11, Node 24.11.1 and bundled Playwright Chromium. Other claimed combinations require the clean-install script below before release sign-off; an unchecked row is not evidence of support.

| Platform | Install/start | Open/edit/save | Render/export | Keyboard/narrow UI | Evidence |
| --- | --- | --- | --- | --- | --- |
| Windows 11 / Node 24 / Chromium | Automated | Automated | Automated | Automated | Local release suite |
| Windows 11 / Node 22.12 / Chrome or Edge | Required | Required | Required | Required | Pending release owner |
| macOS 14+ / Node 22.12+ / Chrome | Required | Required | Required | Required | Pending release owner |
| 64-bit Linux / Node 22.12+ / Chrome | Required | Required | Required | Required | Pending release owner |

## Reproducible checks and packaging

From `editor/`, run `npm ci`, `npm run check:release:browser`, and `npm run package:release`. The release check regenerates the schema inventory, runs Node tests, builds production assets, measures the deterministic benchmark, and optionally runs all browser tests. Packaging creates `release/archify-local-editor-<version>.tgz` containing the production UI, local server, five compiler renderers and schemas, examples, dependency manifest, license, and notices. Extract it outside the development checkout, run `npm ci`, start it, and complete open/edit/save/render/stop before recording package acceptance.

The server binds only to `127.0.0.1`, checks Host and Origin, requires a random session token for mutations, limits JSON to 5 MB, bounds nesting/value counts and compiler duration/output, blocks remote brand fetches, confines file access to the selected file or workspace, rejects traversal and symlinks, and uses revision-checked temporary replacement. The HTML preview uses a sandboxed iframe. These controls define the local threat boundary; independent security/legal acceptance remains human-owned.

## Compatibility and upgrades

Editor `0.1.x` uses the compiler and schemas shipped in the same package. Mixing files from another release is unsupported. Diagram versions stay unchanged during open, canvas editing, JSON editing, render and save. A supported migration must show original and proposed JSON, retain a downloadable original, validate the candidate, and apply only after the user selects Apply. Workflow v1→v2 is the first such migration.

Local recovery, templates, views, locks and panel settings use versioned browser-storage records. Unknown record versions are ignored or surfaced as unreadable; they never modify diagram JSON. Before upgrade or rollback, save diagram files and export important checkpoints/templates. Rollback can read diagram versions supported by the older compiler, but it may ignore newer local preferences and cannot promise recovery-record compatibility.

## Canonical JSON export

Export uses UTF-8 JSON, two-space indentation, LF newlines, and one final newline. Property and array order follow the in-memory source except where an explicit structural operation documents reordering. Undefined JavaScript values are omitted by JSON serialization; schema defaults are not inserted. IDs, schema version, optional fields, unrelated routes and source metadata survive supported edits. Viewport, selection, history, recovery, filters, locks, shortcuts and other editor state never enter diagram JSON.

## Acceptance and ownership

Manual screen-reader acceptance (F122), representative-user/product sign-off (F126), independent security/legal acceptance (F140), and release ownership/support policy (F149) require named people. Record the person, date, build/package hash, tested workflows, observed barriers, accepted residual risks, distribution channel, support window and incident contact. Until those records exist, engineering checks may pass but the product must not be described as fully signed off.

For support, open Help → Support bundle, review every field, then download it. The bundle excludes diagram labels/content, metadata, paths, tokens, revisions and recovery data. Attach the diagram separately only when the user chooses to disclose it. File conflicts, storage failures and recovery actions are described in `editor/README.md`.
