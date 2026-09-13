# Editor workflow backlog

Approved F53–F60 batch. Deliver each item with focused verification, a separate commit and push. Preserve Archify JSON as the document contract. Delivery order: F60, F53, F54, F55, F56, F57, F58, F59.

| ID  | Feature                     | Acceptance                                                                                                   | Status      |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------- |
| F53 | Inline labels               | Double-click a canvas node; Enter applies once, Escape cancels; respect locks and pending work.              | Implemented |
| F54 | Context actions             | Mouse and keyboard canvas menu for duplicate, lock, connect, arrange and delete with edit guards.            | Implemented |
| F55 | Focus mode and panel sizing | Collapse sidebars; bounded panel sizes; preferences outside JSON; usable narrow layout.                      | Implemented |
| F56 | Insert into connection      | Preview new component and split connections with explicit metadata/routing policy; cancel or apply once.     | Implemented |
| F57 | Resolve overlaps            | Preview deterministic small movements of unlocked selected boxes, preserve pinned boxes, cancel/undo.        | Implemented |
| F58 | Layout presets              | Save and apply bounded local layout/snapping preferences without changing diagram JSON.                      | Implemented |
| F59 | Recover undo history        | Bounded retained history alongside recovery draft, validated before restoration; legacy draft compatibility. | Implemented |
| F60 | Interaction audit           | Verify interrupted gestures, previews, source switches and busy guards; harden confirmed gaps.               | Implemented |

## Delivery

Commit IDs and verification results will be recorded below.

### F59 completion — 2026-09-13

Implementation preserved in `bea1b1c`. Recovery includes at most 20 past/future snapshots with a 1,048,576-character serialization budget for history metadata. Every retained snapshot is validated before restoration; legacy or invalid history falls back to the applied draft. History stays outside exported Archify JSON.

Verified: one focused Node test, three browser recovery tests (undo/redo, unapplied text, external source protection), production build. This continuation completed only F59; batch-wide integration cleanup remains separate.
