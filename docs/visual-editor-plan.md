# Archify visual editor

The editor follows this flow: **Archify JSON → React Flow editor → updated Archify JSON → Archify HTML output**.

The editor has its own working representation. It does not need to reproduce Archify's SVG or exact appearance. Correct JSON round-tripping is the compatibility contract; the unchanged Archify CLI owns final rendering and strict layout validation.

## Implemented scope

The editor lives in `editor/` and supports architecture, workflow, dataflow, lifecycle and sequence diagrams:

- Open JSON or launch against a file for direct saving.
- Drag and multi-select components, snap to a grid, pan/zoom, and nudge with the keyboard.
- Edit positions, sizes, labels and sublabels in the inspector.
- Edit connection routes, endpoint sides, waypoints and label positions through fields.
- Undo/redo complete document edits, including one history entry per drag.
- Apply schema-validated JSON text edits and download the result.
- Save directly to the launched file with external-change detection and atomic replacement.
- Render applied JSON using Archify and preview/download the generated HTML.
- Resize boxes and drag labels/waypoints with undo and cancellation.
- Create architecture documents and edit their topology.
- Recover local drafts and navigate compiler diagnostics to affected items.

## Document contract

The original JSON is authoritative. Canvas nodes and edges are derived from it; interactions patch explicit fields. Never save React Flow's native state as Archify JSON. Preserve IDs, relationships, metadata, source references, views and array order. Keep selection, zoom and history outside JSON.

Dragging writes component `pos`; grid hints remain available for reset. Resizing writes `size`. Moving an endpoint preserves authored `via` and `labelAt`; automatic editor routes follow endpoints but are not saved as authored routing. Boundaries reflect `wraps` without changing membership. Existing `meta.viewBox` is preserved and out-of-bounds components are reported.

Schema-valid drafts remain editable and saveable despite layout conflicts. Full Archify validation remains mandatory for HTML generation. JSON syntax/schema errors remain visible for correction. Failed saves and failed renders keep the draft intact.

## Structure

- `editor/src/document.mjs`: immutable JSON patches, coordinate resolution, history and basic layout notes.
- `editor/src/main.jsx`: React Flow canvas, inspector, source editor and file/render actions.
- `editor/server.mjs`: loopback HTTP server, schema validation, scoped saving and isolated CLI invocation.
- `editor/test/`: adapter, server, renderer integration and browser checks.

No renderer extraction or shared SVG implementation is required. React Flow replaces handwritten canvas interaction code; the adapters in `editor/src/adapters/` preserve each type's supported fields and semantics.

## Feature delivery

The [feature list](editor-features.md) records all ten delivered additions. Diagram creation controls target architecture. Other types edit existing JSON with their own placement constraints; sequence exposes participant ordering and bounded message spacing instead of unsupported free coordinates. Alignment/distribution and automatic route repair are outside this batch.

See the [usage guide](../editor/README.md) and [implementation tasks](plans/2026-09-07-json-editor.md).
