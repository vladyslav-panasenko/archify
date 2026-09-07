# Editor library research

Checked 2026-09-07 against official documentation and repositories. This is a fit assessment for the [draft visual editor plan](visual-editor-plan.md), not a dependency decision or implementation result.

Implementation update: the user clarified that the editor may use its own visual representation and Archify renders the resulting JSON separately. React Flow was selected for this JSON-first workflow. The SVG-fidelity weighting and two-candidate experiment below record the earlier assessment; they are superseded by the [current design](visual-editor-plan.md).

The useful comparison is how much interaction work a library removes while preserving Archify JSON, geometry, and exported appearance. A library's own save format is not an Archify adapter.

## Shortlist

| Candidate | Documented capabilities and license | Fit assessment for Archify |
| --- | --- | --- |
| **interact.js over existing SVG** | MIT; drag, resize, gestures and snapping. Application code supplies visual feedback and state updates. [Repository](https://github.com/taye/interact.js), [docs](https://interactjs.io/docs/), [snapping](https://interactjs.io/docs/snapping/). | First candidate for the current refinement scope. Keeps Archify rendering authoritative and avoids translating shapes into another renderer. We still own selection, undo, coordinate conversion, routes, and persistence. |
| **React Flow** | MIT core; React custom nodes receive selection, dragging and connection handling. Saving uses nodes/edges state or `toObject`. [Repository](https://github.com/xyflow/xyflow), [custom nodes](https://reactflow.dev/learn/customization/custom-nodes), [save/restore](https://reactflow.dev/examples/interaction/save-and-restore). | Strongest alternative if the editor will grow into a full node/edge authoring product. Adds React and an adapter between Archify and React Flow nodes/edges. Custom nodes can retain styling, but exact geometry and export parity still require shared Archify rendering logic and verification. |
| **maxGraph** | Apache-2.0; browser diagramming library with TypeScript and plugins. Its model uses cells; model changes are transactional and undoable. Standard model serialization is XML. [Repository](https://github.com/maxGraph/maxGraph), [cells](https://maxgraph.github.io/maxGraph/docs/manual/cells/), [model](https://maxgraph.github.io/maxGraph/api-docs/classes/GraphDataModel.html), [codecs](https://maxgraph.github.io/maxGraph/docs/usage/codecs/). | Worth reconsidering for a rich diagram editor with extensive shape/connector tooling. For moving existing Archify items, translating cells, styles, hierarchy and routing introduces more work than the current scope appears to need. XML serialization does not prevent JSON integration, but that integration is ours to write. |
| **Excalidraw** | MIT; React editor with shapes, bound arrows, undo/redo, pan/zoom, PNG/SVG export and its own JSON scene format. APIs expose initial data and change callbacks. [Repository](https://github.com/excalidraw/excalidraw), [props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/), [export](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export). | Useful interaction reference and strong whiteboard option. Weak fit for faithful refinement of Archify output: scene elements and drawing behavior require translation, and its SVG export does not automatically reproduce Archify's rendering or validation. |

React Flow's published undo/redo implementation is a **Pro example**, separately licensed from MIT core. Its editable-edge and helper-line examples are also listed as Pro. We can implement these behaviors ourselves; do not count the paid examples as freely reusable core features. [Undo/redo](https://reactflow.dev/examples/interaction/undo-redo), [Pro examples](https://reactflow.dev/examples/pro-examples).

tldraw is outside this permissive OSS shortlist: its current SDK uses a custom license, and production use requires a license key. [License](https://tldraw.dev/community/license), [license key](https://tldraw.dev/sdk-features/license-key).

## Recommended evaluation

Compare two small disposable integrations before committing to a library: **interact.js with Archify SVG**, and **React Flow with custom Archify nodes and shared routing**. This is a recommendation to evaluate, not evidence that either integration already works.

Use the same representative architecture JSON containing grid placement, explicit positions, a wrapping boundary, an automatic connection, and an authored waypoint/label. Exercise drag at several zoom levels, cancel, undo, save/reopen, and CLI regeneration. Compare implementation complexity and visual fidelity, not just whether a box moves.

Both candidates must preserve all unrelated JSON fields, write only intended layout edits, retain manual routing, and reproduce editor geometry through Archify export. Keep the original document as the authoritative model; translate interaction events into explicit layout commands rather than rebuilding JSON from a library's export.

Prefer interact.js if it satisfies the complete editing loop with limited interaction code. Prefer React Flow only if its reusable selection, node/edge interaction and future authoring capabilities outweigh the rendering adapter and framework cost. maxGraph and Excalidraw need no prototype unless scope changes.

No package was installed and no renderer or plan was changed by this research.
