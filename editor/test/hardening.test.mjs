import test from "node:test";
import assert from "node:assert/strict";
import { createDiagram } from "../src/topology.mjs";
import {
  assertDocument,
  patchComponent,
  patchConnection,
  history,
  commit,
  undo,
  redo,
  serialize,
} from "../src/document.mjs";
import { sourceNodes } from "../src/adapters/index.mjs";
import { validate } from "../server.mjs";

for (const type of [
  "architecture",
  "workflow",
  "dataflow",
  "lifecycle",
  "sequence",
]) {
  test(`${type}: 200 edits retain bounded reversible history and valid JSON`, () => {
    const original = createDiagram(type, "History"),
      id = sourceNodes(original)[0].id;
    let state = history(original);
    for (let i = 0; i < 200; i++)
      state = commit(
        state,
        patchComponent(state.present, id, { label: `Step ${i}` }),
      );
    assert.equal(state.past.length, 100);
    const final = serialize(state.present);
    for (let i = 0; i < 100; i++) state = undo(state);
    validate(state.present);
    for (let i = 0; i < 100; i++) state = redo(state);
    assert.equal(serialize(state.present), final);
    validate(state.present);
    state = undo(state);
    state = commit(
      state,
      patchComponent(state.present, id, { label: "Branch" }),
    );
    assert.equal(state.future.length, 0);
    assert.equal(original.meta.title, "History");
  });
}
test("invalid geometry, duplicate references and malformed collections are rejected", () => {
  const doc = createDiagram("architecture", "Invalid");
  for (const pos of [[], [1], [1, 2, 3], [NaN, 0], [Infinity, 1]])
    assert.throws(() => patchComponent(doc, "component-1", { pos }));
  assert.throws(() => assertDocument({ ...doc, components: [null] }));
  assert.throws(() =>
    assertDocument({
      ...doc,
      connections: [
        { id: "e", from: "component-1", to: "component-1" },
        { id: "e", from: "component-1", to: "component-1" },
      ],
    }),
  );
  const wf = createDiagram("workflow", "Invalid");
  assert.throws(() =>
    assertDocument({ ...wf, lanes: [...wf.lanes, ...wf.lanes] }),
  );
  assert.throws(() => patchComponent(wf, "node-1", { yOffset: NaN }));
  const life = createDiagram("lifecycle", "Invalid");
  assert.throws(() =>
    patchComponent(life, "node-1", { lane: "terminal", col: 4 }),
  );
  assert.throws(() =>
    patchConnection(
      { ...doc, connections: [{ from: "component-1", to: "component-1" }] },
      0,
      { via: [[1]] },
    ),
  );
});
