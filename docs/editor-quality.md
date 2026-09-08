# Editor quality checks

## F29 hardening audit

The audit covers all five JSON adapters, import validation, immutable updates and bounded history. Fixed:

- Coordinate arrays previously accepted empty, short or oversized pairs through direct editor operations. Node positions, sizes, labels and waypoints now require finite coordinate pairs.
- Duplicate lane and connection IDs could pass the editor's cross-reference checks. They now produce explicit errors.
- Lifecycle event/terminal columns could exceed the renderer's three-column bands. Their limits now follow the actual lane capacity, and the main lane remains required.
- Nonfinite logical offsets and malformed collection entries now fail before canvas projection.

The regression suite runs 200 edits for every type, undoes/redoes the retained 100-step history, checks divergent edits and validates the resulting documents. Imported schema validation and browser tests continue to verify that rejected input leaves the current draft intact. This is local regression evidence, not a claim that every possible document has been tested.
