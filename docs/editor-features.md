# Editor feature backlog

The editor edits Archify JSON. Archify owns final HTML rendering. Both feature batches are implemented. No feature requires visual parity with Archify's HTML.

## Completed batch

| ID  | Feature                     | Done when                                                                                                                   | Status      |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| F01 | Mouse resizing              | Resize a selected component with handles, preserve JSON fields, undo once, and cancel with Escape.                          | Implemented |
| F02 | Draggable connection labels | Drag labels in diagram coordinates, save label placement, undo and cancel.                                                  | Implemented |
| F03 | Draggable waypoints         | Add, move and remove route points visually without replacing unrelated routing fields.                                      | Implemented |
| F04 | Actionable validation       | Select affected items from diagnostics and see supported corrective actions without silently changing JSON.                 | Implemented |
| F05 | Diagram creation            | Start an architecture document, add/remove components and connections, and undo topology edits without dangling references. | Implemented |
| F06 | Draft recovery              | Recover unsaved local drafts after refresh; keep recovery separate from the source file and detect a changed source.        | Implemented |
| F07 | Workflow support            | Open/edit/save/render workflow JSON using its lane/column constraints.                                                      | Implemented |
| F08 | Dataflow support            | Open/edit/save/render dataflow JSON using its supported placement fields.                                                   | Implemented |
| F09 | Lifecycle support           | Open/edit/save/render lifecycle JSON using its supported placement fields.                                                  | Implemented |
| F10 | Sequence support            | Open/edit/save/render sequence JSON with participant ordering and message semantics preserved.                              | Implemented |

The existing editor already has component dragging, multi-selection, numeric properties, JSON import/export, direct saving, undo/redo and HTML generation. Later diagram types expose only edits their schemas can represent; they do not acquire invented free-position fields. Tests must cover JSON round trips and the type's renderer as well as browser interaction.

## Second batch

**Implemented: F11–F28.** Priority reflects the benefit to manual refinement: P1 removes common editing friction, P2 expands visual authoring, and P3 improves larger-document workflows.

### P1 — Faster manual refinement

| ID  | Feature                         | Done when                                                                                                                                                                                                                                        |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F11 | Align and distribute selections | Align selected items by edges or centers and distribute three or more with equal gaps. Show actions only where the schema can represent the result; one action produces one undo step.                                                           |
| F12 | Smart snapping and guides       | Show alignment and spacing guides while moving or resizing, with configurable grid spacing and a modifier to bypass snapping. Save only the resulting supported layout fields.                                                                   |
| F13 | Duplicate and copy/paste        | Duplicate a selection or paste an editor selection with fresh IDs, remap connections between copied items, and offset placement. Preserve unknown fields; reject incompatible diagram types without changing the draft. Start with architecture. |
| F14 | Draw and reconnect connections  | Drag between component handles to create a connection; move either endpoint of an existing connection. Preserve its ID, label and routing fields unless the user explicitly resets them. Start with architecture.                                |
| F15 | Bulk properties and deletion    | Edit shared supported properties across a selection and display mixed values accurately. Delete a selection with a summary of affected references; undo restores everything. Respect schema minimums.                                            |
| F16 | Lock items during arrangement   | Lock selected items against accidental canvas movement and resizing; provide a visible unlock action and keyboard access. Store locks as local editor preferences, outside Archify JSON.                                                         |
| F17 | Reset manual layout overrides   | Reset selected label placements, waypoints or node overrides independently to the schema's defaults. Explain exactly which fields will be removed, preserve required placement fields, and support undo.                                         |

### P2 — More complete visual authoring

| ID  | Feature                         | Done when                                                                                                                                                                                                     |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F18 | Architecture boundaries         | Create and edit boundary labels and membership, and move their members together. Update existing boundary fields and component positions without introducing editor-only groups into JSON.                    |
| F19 | Workflow creation and topology  | Create workflow documents, lanes, nodes and edges visually. Reassignment and deletion keep lane references and edges valid; preserve the imported schema version.                                             |
| F20 | Dataflow creation and topology  | Create dataflow documents, stages, nodes and flows visually. Stage edits and deletions handle affected references explicitly and produce renderer-valid JSON.                                                 |
| F21 | Lifecycle creation and topology | Create lifecycle documents, states and transitions visually, including supported event and terminal lanes. Keep lane membership and transition references valid.                                              |
| F22 | Sequence creation and structure | Create participants and messages, edit sender/receiver and supported message properties, and manage activations and segments. Inserting, reordering or deleting messages handles dependent ranges explicitly. |
| F23 | Diagram settings inspector      | Edit supported title, description, theme and layout settings through schema-specific controls. Preserve unknown metadata and clearly distinguish preview-affecting settings from editor preferences.          |

### P3 — Larger documents and review

| ID  | Feature                    | Done when                                                                                                                                                                                                        |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F24 | Search and focus           | Search component and connection IDs and labels, navigate results by keyboard, and fit the canvas to a result or selection. Temporary focus/filter state never deletes or rewrites JSON items.                    |
| F25 | JSON change review         | Show changes since the last opened or saved version, grouped by item and field, before saving or downloading. Distinguish topology edits from layout edits; leave the source untouched until an explicit save.   |
| F26 | Source conflict comparison | When a source revision changes, compare the original, current source and local draft. Offer explicit choices for conflicting edits, validate the combined result, and recheck the source revision before saving. |
| F27 | Named local checkpoints    | Save and restore named document snapshots with timestamps and a clear local-storage limit. Restoring is undoable and does not overwrite the source file; checkpoints can be exported.                            |
| F28 | Guided views editor        | Create and edit architecture guided views using the existing schema, select referenced components, and validate those references after topology changes. Archify remains responsible for rendering the views.    |

### Suggested order and acceptance rules

Start with **F11–F14**: alignment, snapping, duplication and mouse-created connections provide the largest improvement to everyday editing. Follow with F15–F18, then implement each remaining diagram type's creation tools separately. F25 should precede F26 so conflict handling can reuse the comparison UI.

For every feature:

- Keep the original JSON as the source of truth and preserve unrelated and unknown fields.
- Expose only actions the active schema can represent; document type-specific limitations.
- Make each user action undoable and each active gesture cancellable with Escape.
- Verify JSON round trips, affected references and real browser interactions; run the relevant Archify renderer for supported examples.
- Keep selection, guides, locks and other editor preferences outside exported diagram JSON.
- When implementation is requested, deliver one tested commit and push per feature, as in the first batch.

## Delivery commits

All features are pushed to `main` in the private repository.

| Feature | Commit    |
| ------- | --------- |
| F01     | `91f0cf9` |
| F02     | `746601c` |
| F03     | `b488400` |
| F04     | `bdbfa03` |
| F05     | `76e46f7` |
| F06     | `bfac33e` |
| F07     | `a290626` |
| F08     | `19ba15c` |
| F09     | `92ffc52` |
| F10     | `e119f22` |
| F11     | `fdbc7c3` |
| F12     | `69c2d6e` |
| F13     | `55d637e` |
| F14     | `4fb7bef` |
| F15     | `e919880` |
| F16     | `3c7dcb8` |
| F17     | `f5b821a` |
| F18     | `c185bfe` |
| F19     | `abe694b` |
| F20     | `c8fcb6c` |
| F21     | `369820d` |
| F22     | `1c84203` |
| F23     | `18f9814` |
| F24     | `7027400` |
| F25     | `16d438d` |
| F26     | `794e1a6` |
| F27     | `34e55d9` |
| F28     | `ce11d1b` |
