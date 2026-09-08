# Archify Editor

A local visual editor for Archify architecture JSON. React Flow provides the editing canvas; Archify generates the final HTML. The canvas is a working representation, not an exact preview of the compiler's routing, typography, or themes.

## Start

Requires Node.js 22.12 or newer. From this directory:

```powershell
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4173. The sample diagram opens without modifying its source. **Open JSON** imports a file; **Download JSON** exports the edited document.

To save directly to an existing file:

```powershell
npm start -- --file "D:\Diagrams\system.architecture.json"
```

The path is resolved relative to the terminal's working directory. **Save file** updates only that opened file. A revision check rejects saves if another process has changed it; download your draft before reloading in that case. Saves use a temporary sibling file followed by replacement. This detects external changes before replacement but is not a shared editing or filesystem locking protocol.

For development, use `npm run dev` (also accepts `-- --file ...` and `-- --port 4174`). Assets are local; there are no runtime CDN dependencies.

## Editing

- Drag components; Shift-click to select several. Drag a selection to move it together.
- Use the Properties panel for exact X/Y coordinates, width, height, labels and sublabels.
- Resize selected components with the corner/edge handles. Each resize is one undoable edit; Escape cancels it.
- Arrow keys move selected components by one diagram unit; Shift+Arrow moves by ten.
- Use the zoom buttons or mouse wheel. Hold Space while dragging to pan; middle/right mouse dragging also pans.
- Enable **Snap to grid** for 10-unit drag increments. Escape cancels an active drag.
- Undo/redo records a whole drag as one edit. Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y are supported outside text fields.
- Select a connection to edit its label, endpoint sides, routing mode, waypoints and label position. Coordinates are edited through fields; direct waypoint and label dragging are not included yet.
- Open the JSON panel to edit other supported fields. **Apply JSON** validates and updates the canvas. Unapplied text blocks canvas edits and saving until applied or discarded.

Layout edits patch the original document. Existing metadata, sources, views, component IDs, connection IDs, array ordering and authored routes remain intact. Saving normalizes whitespace to two-space indentation and a trailing newline. Pointer coordinates are rounded to two decimals. Grid items gain `pos` overrides and keep their original row/column hints; **Reset to grid position** removes the override.

## Render

**Render HTML** sends the current applied JSON to the unchanged Archify architecture CLI in a temporary directory. A successful result opens in an isolated preview and can be downloaded as self-contained HTML. `meta.output` is preserved in JSON but never used as permission to write an arbitrary path.

Schema-valid drafts can be saved with overlapping components. The canvas reports basic overlap/bounds notes; Archify performs its full route, label and layout validation at render time. Errors leave the draft intact. A changed document invalidates the prior preview.

Remote brand images are preserved in JSON but are not fetched by this local render endpoint. Use built-in brands or the existing Archify CLI for those documents. Source verification requiring a repository root also belongs in the CLI workflow. Editor exports do not change upstream rendering behavior.

## Scope

Architecture diagrams are supported first. Other diagram types are rejected with a message, without replacing the current document. Node/connection creation and deletion, group resizing, alignment tools, automatic route repair, and other diagram-type adapters are future work. Zoom, selection and undo history are never written into Archify JSON. Working drafts are held in memory; save or download them before closing the editor.

## Checks

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Tests cover JSON preservation, grid overrides, history, scoped saving, conflicts, strict renderer validation, actual browser dragging, download/reopen, keyboard movement and invalid input. React Flow's MIT core is used; no Pro example code is included.
