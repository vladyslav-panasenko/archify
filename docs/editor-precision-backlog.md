# Editor precision and reliability backlog

Approved batch: F45–F52. Archify JSON remains authoritative. Each feature receives focused checks, a separate commit and push, followed by the full suite.

| ID  | Feature                      | Acceptance                                                                                                                                            | Status      |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| F45 | Smart alignment guides       | Extend existing snapping with a screen-pixel threshold and nearby equal-spacing candidates; preserve group offsets, Alt bypass and undo.              | Implemented |
| F46 | Canvas attachment controls   | Select either endpoint side directly on the canvas; retain endpoints, labels and authored routing; keyboard accessible and undoable.                  | Implemented |
| F47 | Route simplification         | Preview redundant-waypoint removal or straightening; Apply once or Cancel; preserve unrelated edge fields.                                            | Implemented |
| F48 | Fit boundaries to contents   | Explicit fit action with configurable padding and computed dimensions; use native wraps/pad JSON and preserve member placement.                       | Implemented |
| F49 | Anchored partial arrangement | Arrange unlocked selected nodes relative to directly connected fixed neighbors; preview, cancel and undo; retain anchors and routes.                  | Implemented |
| F50 | External-file changes        | Detect revision changes while open; offer explicit reload or merge, preserve drafts and unapplied text, ignore stale responses after switching files. | Implemented |
| F51 | Large-diagram performance    | Add repeatable realistic benchmarks, measure bottlenecks and improve projection/diagnostics or rendering with equivalent results.                     | Implemented |
| F52 | JSON round-trip coverage     | Exercise edits for all five schemas through serialize/reopen/undo, asserting unrelated fields survive and outputs validate.                           | Implemented |

## Delivery

Feature commits, measured checks and scope details are recorded here as work completes.

| Feature | Commit    |
| ------- | --------- |
| F45     | `cbcb27d` |
| F46     | `29c1d88` |
| F47     | `bb4b8e9` |
| F48     | `818301f` |
| F49     | `fae7740` |
| F50     | `338a55f` |
| F51     | `edf2fe3` |
| F52     | `37e32b4` |

All features were committed and pushed separately. Final verification: 60 Node tests and 60 browser tests passed, plus a production build. After the canvas control layout correction, the build and all six precision browser tests passed again. Desktop and 390-pixel screenshots were inspected.

Scope: free geometry tools target architecture diagrams; other diagrams retain schema-specific movement. Boundaries continue using native wraps/pad rather than storing independent rectangle coordinates. Anchored layout balances direct fixed neighbors and falls back to directed layout when none exist. Source watching is local polling (10 seconds plus focus), not real-time collaboration. The performance improvement targets automatic label placement; measured computation results and limits are in [editor-performance.md](editor-performance.md).
