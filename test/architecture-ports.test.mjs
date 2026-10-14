import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { architecture as validateArchitecture } from "../archify/renderers/shared/generated-validators.mjs";
import { createRouter } from "../archify/renderers/architecture/routing.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "archify");
const document = (version = 2) => ({ schema_version: version, diagram_type: "architecture", meta: { title: "Persisted ports", output: "ports.html", viewBox: [700, 400] }, components: [{ id: "source", type: "backend", label: "Source", pos: [100, 120], size: [120, 80], ports: [{ id: "source-http", side: "right", offset: 0.25, label: "HTTP" }] }, { id: "target", type: "database", label: "Target", pos: [450, 120], size: [120, 80], ports: [{ id: "target-write", side: "left", offset: 0.75 }] }], connections: [{ id: "write", from: "source", to: "target", fromPort: "source-http", toPort: "target-write" }] });

function run(doc) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "archify-ports-")), input = path.join(folder, "input.json"), output = path.join(folder, "output.html");
  fs.writeFileSync(input, JSON.stringify(doc));
  const result = spawnSync(process.execPath, [path.join(root, "renderers/architecture/render-architecture.mjs"), input, output], { encoding: "utf8" });
  const html = result.status === 0 ? fs.readFileSync(output, "utf8") : "";
  fs.rmSync(folder, { recursive: true, force: true });
  return { ...result, html };
}

test("architecture v2 renders connection endpoints at authored ports", () => {
  assert.equal(validateArchitecture(document()), true, JSON.stringify(validateArchitecture.errors));
  const result = run(document()); assert.equal(result.status, 0, result.stderr);
  assert.match(result.html, /data-port-id="source-http"/);
  assert.match(result.html, /data-composition-points="220,140;[^\"]*450,180"/);
});

test("architecture v1 and cross-component port references are rejected", () => {
  const v1 = run(document(1)); assert.notEqual(v1.status, 0); assert.match(v1.stderr, /require architecture schema_version 2/);
  const wrong = document(); wrong.connections[0].fromPort = "target-write";
  const invalid = run(wrong); assert.notEqual(invalid.status, 0); assert.match(invalid.stderr, /does not belong/);
});

test("automatic routing preserves authored ports instead of aligning or spreading them", () => {
  const doc = document();
  doc.components[1].ports[0].offset = 0.3;
  doc.connections[0].fromSide = "top";
  doc.connections[0].toSide = "bottom";
  const boxes = new Map(doc.components.map((component) => {
    const [x, y] = component.pos, [width, height] = component.size;
    return [component.id, { ...component, x, y, width, height, cx: x + width / 2, cy: y + height / 2 }];
  }));
  doc.connections.push({ id: "automatic", from: "source", to: "target" });
  const before = JSON.stringify(doc);
  for (const preferReadableRoutes of [false, true]) {
    const router = createRouter(boxes, doc.connections, { distinctAutomaticPorts: true, preferReadableRoutes });
    const routed = router.pathFor(doc.connections[0]);
    assert.deepEqual(routed.points[0], [220, 140]);
    assert.deepEqual(routed.points.at(-1), [450, 144]);
    assert.equal(router.connectionEndpointSide(doc.connections[0], "source"), "right");
    assert.equal(router.connectionEndpointSide(doc.connections[0], "target"), "left");
  }
  assert.equal(JSON.stringify(doc), before);
});

test("a singly authored port remains exact beside an automatic endpoint", () => {
  const doc = document();
  delete doc.connections[0].toPort;
  const result = run(doc);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.html, /data-composition-points="220,140;[^\"]*450,160"/);
});

test("duplicate authored port IDs are rejected before rendering", () => {
  const doc = document();
  doc.components[1].ports[0].id = "source-http";
  doc.connections[0].toPort = "source-http";
  const result = run(doc);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Port ids must be unique/);
});
