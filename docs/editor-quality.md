# Editor quality checks

## F29 hardening audit

The audit covers all five JSON adapters, import validation, immutable updates and bounded history. Fixed:

- Coordinate arrays previously accepted empty, short or oversized pairs through direct editor operations. Node positions, sizes, labels and waypoints now require finite coordinate pairs.
- Duplicate lane and connection IDs could pass the editor's cross-reference checks. They now produce explicit errors.
- Lifecycle event/terminal columns could exceed the renderer's three-column bands. Their limits now follow the actual lane capacity, and the main lane remains required.
- Nonfinite logical offsets and malformed collection entries now fail before canvas projection.

The regression suite runs 200 edits for every type, undoes/redoes the retained 100-step history, checks divergent edits and validates the resulting documents. Imported schema validation and browser tests continue to verify that rejected input leaves the current draft intact. This is local regression evidence, not a claim that every possible document has been tested.

## F30 performance baseline

Run `node scripts/benchmark.mjs ../docs/performance-after.json` from `editor` after building. The fixture has 500 nodes and 480 edges. Before/after JSON reports are checked in. On this local Node 24/Chromium run, 20 projection frames fell from 100 ms to 12 ms and a 20-step browser drag from 2326 ms to 1694 ms. Opening was 307/289 ms, search/focus 303/299 ms. These single-run wall-clock measurements include automation overhead and are not frame-rate guarantees. Rendering varied from 163 to 276 ms; the renderer was not optimized.

Projections now reuse immutable document snapshots; architecture drags copy changed nodes only. Overlap warnings refresh after a gesture commits, so quadratic diagnostics no longer run on every pointer event. Authored routes and JSON fields remain unchanged. 500 nodes is a tested workload, not a supported maximum; dense labels, routing and smart snapping can still cost more. Server imports remain limited to 5 MB.
