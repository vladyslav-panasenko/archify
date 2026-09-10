# Editor refinement backlog

Approved batch: F37–F44. Keep Archify JSON as the source of truth. Editor navigation, previews and preferences stay outside exported JSON. Deliver each feature with focused tests, a commit and a push; finish with the complete regression suite.

| ID  | Improvement                       | Acceptance                                                                                                                                                                     | Status      |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| F37 | Full-canvas layout preview        | Preview arrangement on the main canvas, retain zoom/pan, block conflicting edits, Apply once or Cancel/Escape without changing JSON.                                           | Implemented |
| F38 | Connection-aware auto-arrange     | Offer deterministic directed layout with direction and spacing controls, cycle handling and crossing-reduction ordering; preserve locked/unselected nodes and authored routes. | Implemented |
| F39 | Drag connection segments          | Drag an authored horizontal/vertical route segment perpendicular to its direction, update its two JSON waypoints in one undo step, and support keyboard movement/cancellation. | Implemented |
| F40 | Problems panel                    | List overlap, bounds and renderer issues with stable item references; select, highlight and step through problems. Mark compiler results stale after edits.                    | Implemented |
| F41 | Inspector navigation and commands | Group panels into task-oriented navigation; provide a searchable keyboard command menu with available actions, shortcuts, focus restoration and disabled-state guards.         | Implemented |
| F42 | Workspace Create / Save As        | Save new diagrams or copies beneath the opened directory, validate paths/content, prevent accidental overwrite and check revisions when replacement is explicitly requested.   | Implemented |
| F43 | Remember document views           | Restore bounded local zoom/pan, selection and panel state across switching/reopening without changing JSON or losing unapplied text.                                           | Implemented |
| F44 | Readable undo history             | Describe edits, show past/current/future states and jump through retained history without losing redo until a new edit.                                                        | Implemented |

## Delivery

| Feature | Commit    |
| ------- | --------- |
| F37     | `58e440e` |
| F38     | `2e00a8a` |
| F39     | `0908a0b` |
| F40     | `f627e76` |
| F41     | `7fbfb6c` |
| F42     | `1372ffc` |
| F43     | `1a793d1` |
| F44     | `83bf724` |

Each feature was committed and pushed separately. Formatting and integration cleanup followed in `443c9c1`.

Scope details: segment handles edit authored orthogonal waypoint pairs; automatic routes retain their existing controls. Save As requires an opened workspace directory and existing parent folders. View preferences are local and limited to 50 documents. Undo history is session-only and retains up to 100 edits.

Final verification (2026-09-10): 49 Node tests and 53 browser tests passed; production build and whitespace checks passed. Desktop Save As/history and narrow command-menu screenshots were inspected. View tests cover both reload and workspace switching with unapplied JSON preserved.
