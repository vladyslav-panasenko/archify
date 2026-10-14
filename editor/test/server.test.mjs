import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEditorServer, render } from "../server.mjs";
import { createDiagram } from "../src/topology.mjs";
const example = JSON.parse(
  await fs.readFile(
    new URL(
      "../../archify/examples/web-app.architecture.json",
      import.meta.url,
    ),
  ),
);

test("save is scoped, revision-checked, and preserves unrelated JSON", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "archify-editor-test-"),
  );
  const file = path.join(directory, "diagram.json");
  await fs.writeFile(file, JSON.stringify(example));
  const server = await createEditorServer({ file });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const session = await (await fetch(`${base}/api/document`)).json();
    const changed = structuredClone(example);
    changed.components[0].pos = [45, 305];
    const put = (token, revision, origin = base) =>
      fetch(`${base}/api/document`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Editor-Token": token,
          Origin: origin,
        },
        body: JSON.stringify({
          document: changed,
          revision,
          path: "ignored.json",
        }),
      });
    assert.equal((await put("wrong", session.revision)).status, 403);
    assert.equal(
      (await put(session.token, session.revision, "https://example.org"))
        .status,
      403,
    );
    assert.equal((await put(session.token, session.revision)).status, 200);
    assert.deepEqual(JSON.parse(await fs.readFile(file, "utf8")), changed);
    assert.equal((await put(session.token, session.revision)).status, 409);
    const refreshed = await (await fetch(`${base}/api/document`)).json();
    await fs.writeFile(file, JSON.stringify(example));
    assert.equal((await put(session.token, refreshed.revision)).status, 409);
    assert.deepEqual(JSON.parse(await fs.readFile(file, "utf8")), example);
    assert.deepEqual(await fs.readdir(directory), ["diagram.json"]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
test("schema-invalid documents cannot be saved; drafts with overlaps can be saved", async () => {
  const server = await createEditorServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const { token } = await (await fetch(`${base}/api/document`)).json();
    const validate = (document) =>
      fetch(`${base}/api/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Editor-Token": token,
        },
        body: JSON.stringify({ document }),
      });
    assert.equal(
      (await validate({ ...example, unexpected: true })).status,
      400,
    );
    const overlapping = structuredClone(example);
    overlapping.components[1].pos = overlapping.components[0].pos;
    assert.equal((await validate(overlapping)).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test("unsupported source opens read-only without losing its original text", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "archify-unsupported-"));
  const file = path.join(directory, "future.json");
  const text = '{\n  "schema_version": 999,\n  "diagram_type": "architecture",\n  "future": true\n}\n';
  await fs.writeFile(file, text);
  const server = await createEditorServer({ file });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/document`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.rawOnly, true);
    assert.equal(data.sourceText, text);
    assert.match(data.limitation, /schema|version|additional|unexpected|required/i);
    assert.equal(data.document, undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
test("Archify renders original JSON and strictly rejects overlapping output", async () => {
  const html = await render(example);
  assert.match(html, /<svg/);
  assert.match(html, /Sample Web App/);
  const overlapping = structuredClone(example);
  overlapping.components[1].pos = overlapping.components[0].pos;
  await assert.rejects(render(overlapping), /overlap|validation/i);
  const remote = structuredClone(example);
  remote.components[0].brand = { url: "https://example.org/icon.svg" };
  await assert.rejects(render(remote));
});
test("3.1.0 legacy contracts open read-only and cannot overwrite authored source", async () => {
  const missingOutput = createDiagram("architecture", "Missing output");
  delete missingOutput.meta.output;
  const guided = createDiagram("architecture", "Legacy views");
  guided.meta.views = [{ id: "view", label: "Focus", focus: ["component-1"] }];
  const legacy = { schema_version: 1, diagram_type: "lifecycle", meta: { title: "Legacy", output: "legacy.html" }, lanes: [{ id: "main", label: "Main" }], states: [{ id: "a", type: "start", label: "Start", lane: "main", col: 0 }, { id: "b", type: "active", label: "Work", lane: "main", col: 1 }], transitions: [{ from: "a", to: "b" }] };
  const story = createDiagram("architecture", "Legacy story");
  story.meta.story = ["Authored step"];
  const directory = await fs.mkdtemp(path.resolve("compatibility-test-"));
  try {
    for (const document of [missingOutput, guided, legacy, story]) {
      const file = path.join(directory, "source.json");
      const text = JSON.stringify(document, null, 4) + "\n";
      await fs.writeFile(file, text);
      const server = await createEditorServer({ file });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const session = await (await fetch(`${base}/api/document`)).json();
        assert.equal(session.rawOnly, true);
        assert.equal(session.sourceText, text);
        const saved = await fetch(`${base}/api/document`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Editor-Token": session.token }, body: JSON.stringify({ document, revision: session.revision }) });
        assert.equal(saved.status, 400);
        assert.equal(await fs.readFile(file, "utf8"), text);
      } finally { await new Promise((resolve) => server.close(resolve)); }
    }
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
test("migration API uses upstream receipts and reports failure diagnostics", async () => {
  const server = await createEditorServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const { token } = await (await fetch(`${base}/api/document`)).json();
    const migrate = (document) => fetch(`${base}/api/migrate`, { method: "POST", headers: { "Content-Type": "application/json", "X-Editor-Token": token }, body: JSON.stringify({ document }) });
    const original = createDiagram("workflow", "Migration");
    const result = await migrate(original), receipt = await result.json();
    assert.equal(result.status, 200);
    assert.equal(receipt.ok, true);
    assert.equal(receipt.document.schema_version, 2);
    assert.equal(original.schema_version, 1);
    assert.ok(Array.isArray(receipt.preExistingDiagnostics));
    assert.ok(Array.isArray(receipt.migrationDiagnostics));
    assert.ok(Array.isArray(receipt.newSchemaDiagnostics));
    const failed = await migrate(createDiagram("architecture", "Wrong type")), error = await failed.json();
    assert.equal(failed.status, 400);
    assert.match(error.error, /Workflow migration failed/);
    assert.ok(error.diagnostics.length);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
