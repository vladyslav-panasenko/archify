import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { newDocument, addComponent, addConnection, removeComponent } from '../src/document.mjs';
import { validate } from '../server.mjs';

test('topology creation and deletion preserve schema and remove dangling references', () => {
  let doc = newDocument('Created'); doc = addComponent(doc, { label: 'Database', type: 'database' });
  doc = addConnection(doc, { from: 'component-1', to: 'component-2', label: 'SQL' });
  doc.boundaries = [{ kind: 'region', label: 'Region', wraps: ['component-2'] }];
  doc.meta.views = [{ id: 'view', label: 'View', focus: ['component-2'] }];
  validate(doc); const next = removeComponent(doc, 'component-2'); validate(next);
  assert.equal(next.connections.length, 0); assert.equal(next.boundaries.length, 0); assert.equal(next.meta.views, undefined);
  assert.equal(doc.components.length, 2);
});
import {
  components,
  moveComponents,
  patchComponent,
  patchConnection,
  history,
  commit,
  undo,
  redo,
  assertDocument,
} from "../src/document.mjs";
const example = JSON.parse(
  await fs.readFile(
    new URL(
      "../../archify/examples/web-app.architecture.json",
      import.meta.url,
    ),
  ),
);

test("moving a component preserves every unrelated field and authored connection", () => {
  const moved = moveComponents(example, new Map([["api", [700.123, 315]]]));
  const expected = structuredClone(example);
  expected.components.find((c) => c.id === "api").pos = [700.12, 315];
  assert.deepEqual(moved, expected);
  assert.deepEqual(
    example.components.find((c) => c.id === "api").pos,
    [670, 300],
  );
});
test("grid items gain explicit overrides while retaining grid hints", () => {
  const doc = {
    diagram_type: "architecture",
    layout: { mode: "grid" },
    components: [{ id: "a", row: 1, col: 2 }],
  };
  assert.deepEqual(components(doc)[0].pos, [360, 184]);
  const moved = moveComponents(doc, new Map([["a", [80, 90]]]));
  assert.deepEqual(moved.components[0], {
    id: "a",
    row: 1,
    col: 2,
    pos: [80, 90],
  });
  assert.deepEqual(
    components(patchComponent(moved, "a", { pos: undefined }))[0].pos,
    [360, 184],
  );
});
test("undo and redo restore whole documents and divergent edits clear redo", () => {
  const moved = moveComponents(example, new Map([["api", [50, 50]]]));
  const state = commit(history(example), moved);
  assert.deepEqual(undo(state).present, example);
  assert.deepEqual(redo(undo(state)).present, moved);
  assert.equal(
    commit(undo(state), patchComponent(example, "api", { size: [150, 90] }))
      .future.length,
    0,
  );
});
test("connection edits preserve IDs, semantics, and neighboring connections", () => {
  const next = patchConnection(example, 1, {
    via: [[500, 90]],
    labelAt: [400, 80],
  });
  const expected = structuredClone(example);
  Object.assign(expected.connections[1], {
    via: [[500, 90]],
    labelAt: [400, 80],
  });
  assert.deepEqual(next, expected);
});
test("reject ambiguous documents and nonfinite positions", () => {
  assert.throws(
    () =>
      assertDocument({
        ...example,
        components: [example.components[0], example.components[0]],
      }),
    /Duplicate/,
  );
  assert.throws(
    () => assertDocument({ ...example, diagram_type: "unsupported" }),
    /architecture/,
  );
  assert.throws(
    () => moveComponents(example, new Map([["api", [NaN, 0]]])),
    /finite/,
  );
});
