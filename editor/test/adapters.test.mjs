import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  moveComponents,
  components,
  patchComponent,
  patchConnection,
} from "../src/document.mjs";
import { validate, render } from "../server.mjs";

test("sequence reorder preserves messages; spacing cannot cross message or activation boundaries", async () => {
  const doc = JSON.parse(
    await fs.readFile(
      new URL(
        "../../archify/examples/cache-miss-request.sequence.json",
        import.meta.url,
      ),
    ),
  );
  const node = components(doc)[0];
  const moved = moveComponents(
    doc,
    new Map([[node.id, [node.pos[0] + 108, 500]]]),
  );
  validate(moved);
  assert.equal(moved.participants[1].id, node.id);
  assert.deepEqual(moved.messages, doc.messages);
  assert.deepEqual(moved.activations, doc.activations);
  assert.equal(moved.participants[1].pos, undefined);
  assert.equal(moved.participants[1].order, undefined);
  const spacedY = doc.messages[0].y + 10;
  const spaced = patchConnection(doc, 0, { y: spacedY });
  validate(spaced);
  assert.equal(spaced.messages[0].y, spacedY);
  assert.throws(() => patchConnection(doc, 0, { y: 300 }), /ordering/);
  assert.equal(
    patchConnection(doc, 0, { labelAt: [900, spacedY - 12] }).messages[0].y,
    spacedY,
  );
  assert.throws(
    () => patchComponent(doc, node.id, { size: [200, 90] }),
    /sizes/,
  );
  assert.match(await render(spaced), /<svg/);
});

test("lifecycle movement preserves lane membership and authored transitions", async () => {
  const doc = JSON.parse(
    await fs.readFile(
      new URL(
        "../../archify/examples/agent-run.lifecycle.json",
        import.meta.url,
      ),
    ),
  );
  const node = components(doc)[0];
  const moved = moveComponents(
    doc,
    new Map([[node.id, [node.pos[0] + 154, node.pos[1] + 5]]]),
  );
  validate(moved);
  assert.equal(moved.states[0].col, 1);
  assert.equal(moved.states[0].yOffset, 5);
  assert.equal(moved.states[0].lane, doc.states[0].lane);
  assert.deepEqual(moved.transitions, doc.transitions);
  assert.equal(moved.states[0].pos, undefined);
  assert.match(await render(doc), /<svg/);
});

test("dataflow movement updates stage/row and retains flows and metadata", async () => {
  const doc = JSON.parse(
    await fs.readFile(
      new URL(
        "../../archify/examples/event-stream.dataflow.json",
        import.meta.url,
      ),
    ),
  );
  const node = components(doc)[0];
  const moved = moveComponents(
    doc,
    new Map([[node.id, [node.pos[0] + 215, node.pos[1] + 114]]]),
  );
  validate(moved);
  assert.equal(moved.nodes[0].stage, 1);
  assert.equal(moved.nodes[0].row, 1);
  assert.deepEqual(moved.flows, doc.flows);
  assert.deepEqual(moved.meta, doc.meta);
  assert.equal(moved.nodes[0].pos, undefined);
  assert.throws(() => patchComponent(doc, node.id, { stage: 99 }), /stage/);
  assert.match(await render(doc), /<svg/);
});

test("workflow adapter changes logical layout and preserves its source contract", async () => {
  const doc = JSON.parse(
    await fs.readFile(
      new URL(
        "../../archify/examples/agent-tool-call.workflow.json",
        import.meta.url,
      ),
    ),
  );
  validate(doc);
  const node = components(doc)[0];
  const moved = moveComponents(
    doc,
    new Map([[node.id, [node.pos[0] + 200, node.pos[1] + 10]]]),
  );
  validate(moved);
  const expected = structuredClone(doc);
  expected.nodes[0].col++;
  expected.nodes[0].yOffset = (expected.nodes[0].yOffset || 0) + 10;
  assert.deepEqual(moved, expected);
  const resized = patchComponent(doc, node.id, { size: [180, 90] });
  validate(resized);
  assert.equal(resized.nodes[0].width, 180);
  assert.equal(resized.nodes[0].size, undefined);
  assert.match(await render(doc), /<svg/);
});
