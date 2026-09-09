# Archify Editor

A local visual editor for all five Archify JSON diagram types. React Flow provides the editing canvas; Archify generates the final HTML. The canvas is a working representation, not an exact preview of the compiler's routing, typography, or themes.

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

The path is resolved relative to the terminal's working directory. **Save file** updates only that opened file. If another process changes it, the editor opens a three-way comparison of the original source, your draft and the current file. Choose a version for every conflict, apply the validated merged draft, then review and save. Saving checks the revision again. Collections without stable IDs are resolved as whole arrays. You can also download your draft separately. Saves use a temporary sibling file followed by replacement; this is not a shared editing or filesystem locking protocol.

For development, use `npm run dev` (also accepts `-- --file ...` and `-- --port 4174`). Assets are local; there are no runtime CDN dependencies.

## Editing

- Drag components; Shift-click to select several. Drag a selection to move it together.
- Use the Properties panel for exact X/Y coordinates, width, height, labels and sublabels.
- Resize selected components with the corner/edge handles. Each resize is one undoable edit; Escape cancels it. Sequence participant sizes are defined by Archify and cannot be resized individually.
- Arrow keys move selected components by one diagram unit; Shift+Arrow moves by ten.
- Use the zoom buttons or mouse wheel. Hold Space while dragging to pan; middle/right mouse dragging also pans.
- Enable **Snap to grid** for drag increments. Architecture's **Snapping** controls set grid spacing and enable alignment/equal-spacing guides; hold Alt while dragging or resizing to bypass snapping. Escape cancels an active drag.
- Undo/redo records a whole drag as one edit. Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y are supported outside text fields.
- Drag connection labels to position them. Select a connection on the canvas or in the Connections list to edit routing and endpoint sides. **Add waypoint** creates a numbered handle; drag it to refine the route, or right-click / press Delete on the focused handle to remove it. Arrow keys also move focused labels and waypoints. Each gesture is one undoable edit.
- Open the JSON panel to edit other supported fields. **Apply JSON** validates and updates the canvas. Unapplied text blocks canvas edits and saving until applied or discarded.

Layout edits patch the original document. Existing metadata, sources, views, component IDs, connection IDs, array ordering and authored routes remain intact. Saving normalizes whitespace to two-space indentation and a trailing newline. Pointer coordinates are rounded to two decimals. Grid items gain `pos` overrides and keep their original row/column hints; **Reset to grid position** removes the override.

## Creating diagrams

The architecture option in **New diagram** creates a document with one initial component. **Add component** chooses a label and type; **Add connection** chooses its endpoints and optional label. IDs are generated without collisions. Delete a component from its inspector to remove it, its incident connections, and its references in boundaries and guided views. Undo restores the complete edit. A diagram must retain at least one component.

Choose any of the five types in **New diagram**. For workflow, dataflow and lifecycle, use **Structure** to add nodes and connections and edit lanes or stages. Deleting a lane or stage requires a destination for its affected nodes; dataflow stage indices are remapped. Workflow schema versions are preserved. Lifecycle's main lane is required, terminal is the outcome band, and other lanes share the event band. Creation produces schema-valid drafts; run **Check diagram** to check final layout after adding items.

For sequence diagrams, **Structure** edits participants, messages, activations and segments. Message Y determines ordering. Structural timing changes ask you to acknowledge that existing ranges retain their absolute coordinates. Participant deletion removes its incident messages and activations; the diagram must keep two participants and one message. Workflow keeps at least one node; dataflow and lifecycle keep at least two.

## Arrangement and authoring tools

- **Arrange selection** aligns architecture components and distributes equal gaps. Each operation is one undo step. Constrained diagram types retain their logical placement controls.
- **Copy and duplicate** copies architecture selections inside the editor. Ctrl/Cmd+D duplicates; Ctrl/Cmd+C and V copy between editor windows when focus is on the canvas. Pasted items get fresh IDs; internal edges and authored coordinates are remapped and offset. Other diagram types cannot receive these selections.
- With multiple items selected, shared property controls display mixed values and apply edits together. Architecture **Delete selection** summarizes affected components, connections, boundaries and views before deletion.
- **Lock selection** prevents canvas dragging, resizing and keyboard nudging. Unlock through the same control. Locks are stored locally by document name and source context, and are never exported. Explicit inspector edits remain available.
- **Reset manual layout** removes optional node position or size overrides. Required free coordinates and logical placement fields remain. Connections have independent reset actions for label coordinates and waypoints; the confirmation lists removed fields.
- **Draw / reconnect connections** enables architecture handles for mouse creation and endpoint dragging. The connection inspector also offers endpoint dropdowns. Reconnection preserves edge identity and other authored routing; Escape exits connection mode.
- Architecture **Structure** edits boundaries and guided views. Select boundary members to drag them together, or move them by an explicit offset. Guided views support up to five named focus sets, which Archify renders in the final HTML.
- **Settings** exposes supported metadata, visual presets, animation, canvas dimensions and type-specific layout options. These affect exported JSON; editor preferences remain local.
- **Search** finds component and connection IDs and labels. Arrow keys navigate results, Enter selects and fits a result, and **Fit selection** centers the current selection without changing JSON.
- **Review** compares the current draft with the last opened or saved version, grouping layout, topology and content changes by item. Review is optional; its save/download buttons use the same validation and revision checks as the toolbar.
- **Checkpoints** stores up to ten named snapshots and 2 MB per document in browser storage. Restoring is undoable and never writes the source file. Export a checkpoint to keep an independent JSON copy; older checkpoints are never silently evicted.

## Diagram types

| Type         | Canvas edits saved to JSON                                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture | Free component `pos` and `size`, connection `via` and `labelAt`.                                                                                                                  |
| Workflow     | Logical `col`, `yOffset`, `width`, `height`; lane membership changes explicitly in the inspector. Both schema versions remain unchanged.                                          |
| Dataflow     | `stage`, `row`, `yOffset`, `width`, `height`. Stages and rows constrain horizontal/vertical placement.                                                                            |
| Lifecycle    | `col`, `yOffset`, `width`, `height`; lane membership changes explicitly. Main, event and terminal bands follow the renderer's rules.                                              |
| Sequence     | Horizontal participant reordering changes only the participants array order. Dragging message labels vertically changes `y`; endpoints and relative message ordering stay intact. |

Sequence messages cannot cross adjacent messages or activation/segment boundaries during spacing edits. Messages exactly on a boundary remain pinned. Use **Participant order** or **Message Y** for keyboard editing. Sequence JSON has no per-participant free positions/sizes or message waypoints, so those controls are absent. Raw JSON changes can explicitly revise the wider model and are validated before application.

Automatic labels avoid component hit targets in the editor. This display adjustment is not saved to JSON; dragging a label creates authored placement. Pinned label positions remain unchanged.

## Render

**Render HTML** sends the current applied JSON to the matching Archify CLI in a temporary directory. A successful result opens in an isolated preview and can be downloaded as self-contained HTML. `meta.output` is preserved in JSON but never used as permission to write an arbitrary path.

Schema-valid drafts can be saved with overlapping components. The canvas reports basic overlap/bounds notes; Archify performs its full route, label and layout validation at render time. Errors leave the draft intact. A changed document invalidates the prior preview.

**Check diagram** runs the same compiler validation without opening the output. Structured errors include **Inspect issue** links to the affected item and the compiler's suggested corrections. Errors without an item reference open the JSON panel. Corrections are always explicit edits.

Remote brand images are preserved in JSON but are not fetched by this local render endpoint. Use built-in brands or the existing Archify CLI for those documents. Source verification requiring a repository root also belongs in the CLI workflow. Editor exports do not change upstream rendering behavior.

## Draft recovery

Unsaved documents and unapplied JSON text are stored in this browser's local storage. After a refresh, choose **Restore draft** or **Discard recovery**. Recovery is local to the browser/profile and server origin; it does not write the source file. If the source revision changed, recovery opens a separate downloadable draft and disables direct saving to that source. Clearing browser storage removes recovery data. Save or download important work; recovery is not a backup service.

Zoom, selection, measurements, recovery metadata and undo history are never written into Archify JSON. See the [completed feature list](../docs/editor-features.md) for the implementation scope and commits.

## Checks

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Tests cover all five adapters and renderers, JSON preservation, grid overrides, history, scoped saving, conflicts, recovery, compiler diagnostics, actual browser dragging/resizing, label/waypoint edits, download/reopen, keyboard movement and invalid input. React Flow's MIT core is used; no Pro example code is included.

Auto-arrange: select architecture components, open Auto-arrange and preview the grid. Locked/unselected components act as obstacles. Apply creates one undo step; Cancel keeps the document. Authored connection routing remains unchanged.

Templates: select architecture components and use Templates to save a named fragment, including internal connections. Import/export template JSON, rename or delete entries, and insert with fresh IDs. Templates use browser storage (20 entries / 2 MB); export important fragments. Inserts are validated and undoable.

JSON editor: place the caret on an object to suggest missing fields, or on an enum/boolean value to suggest allowed values. Insert suggestion changes only unapplied text. Validation errors link to their source line. Locate canvas selection jumps to JSON; Focus item on canvas follows stable IDs back to the diagram. Apply checks schema and references. The schema editor loads on demand.

Project workspace: launch `npm start -- --directory "D:\Diagrams"` (or use `--file`, not both). The Project diagram picker lists valid JSON below that directory. Refresh discovers changes; symbolic links and dependency/Git folders are skipped, files above 5 MB are excluded, and enumeration stops at 10,000 entries. Switching preserves each file's undo history, draft and unapplied text for this session. A reminder counts inactive unsaved drafts; browser recovery remains per file. Save file checks the selected file's revision. Disk changes are reconciled through the existing conflict flow. Imported documents still use downloads and cannot overwrite a project file.
