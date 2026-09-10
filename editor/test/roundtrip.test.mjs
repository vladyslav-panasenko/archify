import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  components,
  moveComponents,
  patchComponent,
  patchConnection,
  serialize,
  history,
  commit,
  undo,
  redo,
  addComponent,
  removeComponent,
} from "../src/document.mjs";
import {
  sourceNodes,
  connections,
  nodeKey,
  edgeKey,
} from "../src/adapters/index.mjs";
import { addNode, deleteNode } from "../src/topology.mjs";
import { validate } from "../server.mjs";
const cases = [
  ["architecture", "web-app.architecture.json", [13, 7]],
  ["workflow", "agent-tool-call.workflow.json", [200, 10]],
  ["dataflow", "event-stream.dataflow.json", [215, 114]],
  ["lifecycle", "agent-run.lifecycle.json", [154, 5]],
  ["sequence", "cache-miss-request.sequence.json", [108, 0]],
];
const omit = (obj, keys) =>
  Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key)),
  );
function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function roundtrip(before, next) {
  validate(next);
  const reopened = JSON.parse(serialize(next));
  assert.deepEqual(reopened, next);
  validate(reopened);
  const state = commit(history(before), reopened);
  assert.deepEqual(undo(state).present, before);
  assert.deepEqual(redo(undo(state)).present, next);
  return reopened;
}
for (const [type, file, delta] of cases)
  test(`${type}: movement, properties, routes and topology round trip without unrelated changes`, async () => {
    const original = freeze(
        JSON.parse(
          await fs.readFile(
            new URL(`../../archify/examples/${file}`, import.meta.url),
            "utf8",
          ),
        ),
      ),
      before = serialize(original),
      node = components(original)[0],
      nk = nodeKey(original),
      ek = edgeKey(original);
    const moved = roundtrip(
      original,
      moveComponents(
        original,
        new Map([[node.id, node.pos.map((v, i) => v + delta[i])]]),
      ),
    );
    assert.deepEqual(omit(moved, [nk]), omit(original, [nk]));
    for (const item of sourceNodes(original)) {
      const changed = sourceNodes(moved).find((n) => n.id === item.id);
      assert.deepEqual(
        omit(changed, ["pos", "col", "row", "stage", "yOffset"]),
        omit(item, ["pos", "col", "row", "stage", "yOffset"]),
      );
    }
    const labeled = roundtrip(
      moved,
      patchComponent(moved, node.id, { label: "Refined node" }),
    );
    assert.deepEqual(omit(labeled, [nk]), omit(moved, [nk]));
    assert.deepEqual(
      sourceNodes(labeled).filter((n) => n.id !== node.id),
      sourceNodes(moved).filter((n) => n.id !== node.id),
    );
    const edged = roundtrip(
      labeled,
      patchConnection(labeled, 0, { label: "Refined connection" }),
    );
    assert.deepEqual(omit(edged, [ek]), omit(labeled, [ek]));
    assert.deepEqual(
      omit(connections(edged)[0], ["label"]),
      omit(connections(labeled)[0], ["label"]),
    );
    assert.deepEqual(
      connections(edged).slice(1),
      connections(labeled).slice(1),
    );
    const routePatch = { labelAt: [200, 174] };
    const routed = roundtrip(edged, patchConnection(edged, 0, routePatch));
    assert.deepEqual(omit(routed, [ek]), omit(edged, [ek]));
    assert.deepEqual(
      omit(connections(routed)[0], ["labelAt", "y"]),
      omit(connections(edged)[0], ["labelAt", "y"]),
    );
    const fields = { ...sourceNodes(original)[0], label: "Additional node" },
      added = roundtrip(
        original,
        type === "architecture"
          ? addComponent(original, fields)
          : addNode(original, fields),
      );
    assert.deepEqual(sourceNodes(added).slice(0, -1), sourceNodes(original));
    assert.deepEqual(omit(added, [nk]), omit(original, [nk]));
    const id = sourceNodes(added).at(-1).id;
    const removed = roundtrip(
      added,
      type === "architecture"
        ? removeComponent(added, id)
        : deleteNode(added, id),
    );
    assert.deepEqual(removed, original);
    assert.equal(serialize(original), before);
  });
