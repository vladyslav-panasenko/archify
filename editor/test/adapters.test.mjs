import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { moveComponents, components, patchComponent } from '../src/document.mjs';
import { validate, render } from '../server.mjs';

test('dataflow movement updates stage/row and retains flows and metadata', async () => {
  const doc = JSON.parse(await fs.readFile(new URL('../../archify/examples/event-stream.dataflow.json', import.meta.url)));
  const node = components(doc)[0]; const moved = moveComponents(doc, new Map([[node.id, [node.pos[0] + 215, node.pos[1] + 114]]]));
  validate(moved); assert.equal(moved.nodes[0].stage, 1); assert.equal(moved.nodes[0].row, 1);
  assert.deepEqual(moved.flows, doc.flows); assert.deepEqual(moved.meta, doc.meta); assert.equal(moved.nodes[0].pos, undefined);
  assert.throws(() => patchComponent(doc, node.id, { stage: 99 }), /stage/);
  assert.match(await render(doc), /<svg/);
});

test('workflow adapter changes logical layout and preserves its source contract', async () => {
  const doc = JSON.parse(await fs.readFile(new URL('../../archify/examples/agent-tool-call.workflow.json', import.meta.url)));
  validate(doc); const node = components(doc)[0];
  const moved = moveComponents(doc, new Map([[node.id, [node.pos[0] + 200, node.pos[1] + 10]]]));
  validate(moved); const expected = structuredClone(doc); expected.nodes[0].col++; expected.nodes[0].yOffset = (expected.nodes[0].yOffset || 0) + 10;
  assert.deepEqual(moved, expected);
  const resized = patchComponent(doc, node.id, { size: [180, 90] }); validate(resized);
  assert.equal(resized.nodes[0].width, 180); assert.equal(resized.nodes[0].size, undefined);
  assert.match(await render(doc), /<svg/);
});
