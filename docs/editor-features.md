# Editor feature backlog

The editor edits Archify JSON. Archify owns final HTML rendering. Each feature below is implemented, tested, committed and pushed separately; this list records the scope agreed for this batch. No feature requires visual parity with Archify's HTML.

| ID | Feature | Done when | Status |
| --- | --- | --- | --- |
| F01 | Mouse resizing | Resize a selected component with handles, preserve JSON fields, undo once, and cancel with Escape. | Implemented |
| F02 | Draggable connection labels | Drag labels in diagram coordinates, save label placement, undo and cancel. | Implemented |
| F03 | Draggable waypoints | Add, move and remove route points visually without replacing unrelated routing fields. | Implemented |
| F04 | Actionable validation | Select affected items from diagnostics and see supported corrective actions without silently changing JSON. | Implemented |
| F05 | Diagram creation | Start an architecture document, add/remove components and connections, and undo topology edits without dangling references. | Implemented |
| F06 | Draft recovery | Recover unsaved local drafts after refresh; keep recovery separate from the source file and detect a changed source. | Implemented |
| F07 | Workflow support | Open/edit/save/render workflow JSON using its lane/column constraints. | Pending |
| F08 | Dataflow support | Open/edit/save/render dataflow JSON using its supported placement fields. | Pending |
| F09 | Lifecycle support | Open/edit/save/render lifecycle JSON using its supported placement fields. | Pending |
| F10 | Sequence support | Open/edit/save/render sequence JSON with participant ordering and message semantics preserved. | Pending |

The existing editor already has component dragging, multi-selection, numeric properties, JSON import/export, direct saving, undo/redo and HTML generation. Later diagram types expose only edits their schemas can represent; they do not acquire invented free-position fields. Tests must cover JSON round trips and the type's renderer as well as browser interaction.
