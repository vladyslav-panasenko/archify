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
| F07 | Workflow support | Open/edit/save/render workflow JSON using its lane/column constraints. | Implemented |
| F08 | Dataflow support | Open/edit/save/render dataflow JSON using its supported placement fields. | Implemented |
| F09 | Lifecycle support | Open/edit/save/render lifecycle JSON using its supported placement fields. | Implemented |
| F10 | Sequence support | Open/edit/save/render sequence JSON with participant ordering and message semantics preserved. | Implemented |

The existing editor already has component dragging, multi-selection, numeric properties, JSON import/export, direct saving, undo/redo and HTML generation. Later diagram types expose only edits their schemas can represent; they do not acquire invented free-position fields. Tests must cover JSON round trips and the type's renderer as well as browser interaction.

## Delivery commits

All features are pushed to `main` in the private repository.

| Feature | Commit |
| --- | --- |
| F01 | `91f0cf9` |
| F02 | `746601c` |
| F03 | `b488400` |
| F04 | `bdbfa03` |
| F05 | `76e46f7` |
| F06 | `bfac33e` |
| F07 | `a290626` |
| F08 | `19ba15c` |
| F09 | `92ffc52` |
| F10 | `e119f22` |
