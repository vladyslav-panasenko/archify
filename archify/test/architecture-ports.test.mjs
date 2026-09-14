import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { architecture as validateArchitecture } from "../renderers/shared/generated-validators.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const document = (version = 2) => ({ schema_version: version, diagram_type: "architecture", meta: { title: "Persisted ports", viewBox: [700, 400] }, components: [{ id: "source", type: "backend", label: "Source", pos: [100, 120], size: [120, 80], ports: [{ id: "source-http", side: "right", offset: 0.25, label: "HTTP" }] }, { id: "target", type: "database", label: "Target", pos: [450, 120], size: [120, 80], ports: [{ id: "target-write", side: "left", offset: 0.75 }] }], connections: [{ id: "write", from: "source", to: "target", fromPort: "source-http", toPort: "target-write" }] });

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
