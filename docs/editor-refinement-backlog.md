# Editor refinement backlog

Approved batch: F37–F44. Keep Archify JSON as the source of truth. Editor navigation, previews and preferences stay outside exported JSON. Deliver each feature with focused tests, a commit and a push; finish with the complete regression suite.

| ID | Improvement | Acceptance | Status |
| --- | --- | --- | --- |
| F37 | Full-canvas layout preview | Preview arrangement on the main canvas, retain zoom/pan, block conflicting edits, Apply once or Cancel/Escape without changing JSON. | Implemented |
| F38 | Connection-aware auto-arrange | Offer deterministic directed layout with direction and spacing controls, cycle handling and crossing-reduction ordering; preserve locked/unselected nodes and authored routes. | Implemented |
| F39 | Drag connection segments | Drag an authored horizontal/vertical route segment perpendicular to its direction, update its two JSON waypoints in one undo step, and support keyboard movement/cancellation. | Implemented |
| F40 | Problems panel | List overlap, bounds and renderer issues with stable item references; select, highlight and step through problems. Mark compiler results stale after edits. | Implemented |
| F41 | Inspector navigation and commands | Group panels into task-oriented navigation; provide a searchable keyboard command menu with available actions, shortcuts, focus restoration and disabled-state guards. | Implemented |
| F42 | Workspace Create / Save As | Save new diagrams or copies beneath the opened directory, validate paths/content, prevent accidental overwrite and check revisions when replacement is explicitly requested. | Implemented |
| F43 | Remember document views | Restore bounded local zoom/pan, selection and panel state across switching/reopening without changing JSON or losing unapplied text. | Implemented |
| F44 | Readable undo history | Describe edits, show past/current/future states and jump through retained history without losing redo until a new edit. | Implemented |

## Delivery

Commit IDs and verification results will be recorded as each item completes.


