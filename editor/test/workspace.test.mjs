import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createEditorServer } from "../server.mjs";
import { newDocument } from "../src/document.mjs";
import { createWorkspace } from "../workspace.mjs";
import { validate } from "../server.mjs";

test("Save As creates exclusively and replaces only the reviewed revision inside the workspace", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "archify-saveas-")),
    outside = await fs.mkdtemp(path.join(os.tmpdir(), "archify-target-"));
  try {
    const ws = await createWorkspace(directory, validate),
      doc = newDocument("New");
    const created = await ws.saveAs("new.json", doc);
    assert.equal(
      JSON.parse(await fs.readFile(path.join(directory, "new.json"), "utf8"))
        .meta.title,
      "New",
    );
    await assert.rejects(
      () => ws.saveAs("new.json", newDocument("Overwrite")),
      (e) => e.status === 409 && e.conflict.revision === created.revision,
    );
    await assert.rejects(
      () => ws.saveAs("new.json", doc, "stale"),
      (e) => e.status === 409,
    );
    await ws.saveAs("new.json", newDocument("Confirmed"), created.revision);
    assert.equal(
      JSON.parse(await fs.readFile(path.join(directory, "new.json"), "utf8"))
        .meta.title,
      "Confirmed",
    );
    for (const name of [
      "../escape.json",
      "/absolute.json",
      "C:\\outside.json",
      "file.json:stream",
      "missing/new.json",
      "CON.json",
    ])
      await assert.rejects(() => ws.saveAs(name, doc));
    await fs.symlink(outside, path.join(directory, "linked"), "junction");
    await assert.rejects(() => ws.saveAs("linked/escape.json", doc));
    assert.deepEqual(await fs.readdir(outside), []);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
});

test("workspace IDs scope reads and writes, preserve per-file revisions and reject redirected folders", async () => {
  const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), "archify-workspace-"),
    ),
    external = await fs.mkdtemp(path.join(os.tmpdir(), "archify-outside-"));
  await fs.mkdir(path.join(directory, "nested"));
  await fs.writeFile(
    path.join(directory, "a.json"),
    JSON.stringify(newDocument("A")),
  );
  await fs.writeFile(
    path.join(directory, "nested", "b.json"),
    JSON.stringify(newDocument("B")),
  );
  await fs.writeFile(path.join(directory, "invalid.json"), "{}");
  await fs.writeFile(
    path.join(external, "b.json"),
    JSON.stringify(newDocument("Outside")),
  );
  const server = await createEditorServer({ directory });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const list = await (await fetch(`${base}/api/workspace`)).json();
    assert.equal(list.files.length, 3);
    assert.equal(list.skipped, 0);
    assert.equal(list.files.find((file) => file.name === "invalid.json").type, "unsupported");
    const a = list.files.find((file) => file.name === "a.json"),
      b = list.files.find((file) => file.name === "nested/b.json");
    const load = (id) =>
      fetch(`${base}/api/document?id=${encodeURIComponent(id)}`);
    const sa = await (await load(a.id)).json(),
      sb = await (await load(b.id)).json();
    assert.equal(sa.document.meta.title, "A");
    assert.equal(sb.document.meta.title, "B");
    const put = (id, revision, document) =>
      fetch(`${base}/api/document?id=${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Editor-Token": sa.token,
        },
        body: JSON.stringify({ document, revision }),
      });
    assert.equal(
      (await put(a.id, sa.revision, newDocument("Edited A"))).status,
      200,
    );
    assert.equal(
      (await put(b.id, sa.revision, newDocument("Wrong revision"))).status,
      409,
    );
    assert.equal(
      (await put(b.id, sb.revision, newDocument("Edited B"))).status,
      200,
    );
    assert.equal((await load("../outside.json")).status, 404);
    await fs.rename(
      path.join(directory, "nested"),
      path.join(directory, "original"),
    );
    await fs.symlink(external, path.join(directory, "nested"), "junction");
    assert.equal((await load(b.id)).status, 400);
    assert.equal(
      (await put(b.id, sb.revision, newDocument("Unsafe"))).status,
      400,
    );
    assert.equal(
      JSON.parse(await fs.readFile(path.join(external, "b.json"), "utf8")).meta
        .title,
      "Outside",
    );
  } finally {
    await new Promise((r) => server.close(r));
    await fs.rm(directory, { recursive: true, force: true });
    await fs.rm(external, { recursive: true, force: true });
  }
});

test("workspace folders, content search, and revision-checked moves stay confined", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "archify-manage-"));
  try {
    const ws = await createWorkspace(directory, validate);
    await ws.createFolder("Systems/Payments");
    assert.deepEqual(ws.list().folders, ["Systems", "Systems/Payments"]);
    await assert.rejects(() => ws.createFolder("../escape"));
    const created = await ws.saveAs("source.json", newDocument("Unique ledger label"));
    const matches = await ws.search("ledger");
    assert.equal(matches.length, 1);
    assert.equal(matches[0].name, "source.json");
    await assert.rejects(() => ws.rename(created.id, "Systems/Payments/moved.json", "stale"), (error) => error.status === 409);
    const moved = await ws.rename(created.id, "Systems/Payments/moved.json", created.revision);
    assert.equal(moved.name, "Systems/Payments/moved.json");
    assert.equal(await fs.stat(path.join(directory, "Systems", "Payments", "moved.json")).then((stat) => stat.isFile()), true);
    await assert.rejects(() => ws.resolve(created.id), (error) => error.status === 404);
    await ws.saveAs("occupied.json", newDocument("Occupied"));
    await assert.rejects(() => ws.rename(moved.id, "occupied.json", moved.revision), (error) => error.status === 409);
    assert.deepEqual(await ws.readPreferences(), { preferences: null, revision: null });
    const preferences = { gridSize: 16, smartSnap: true, minimap: true, layout: { mode: "directed", direction: "right", gap: 60 } };
    const savedPreferences = await ws.savePreferences(preferences, null);
    assert.deepEqual((await ws.readPreferences()).preferences, preferences);
    await assert.rejects(() => ws.savePreferences(preferences, null), (error) => error.status === 409);
    const output = await ws.writeOutput("Systems", "source.json", "<html>ok</html>");
    assert.equal(output, "Systems/source.html");
    await assert.rejects(() => ws.writeOutput("Systems", "source.json", "replace"), (error) => error.status === 409);
    assert.equal(await fs.readFile(path.join(directory, output), "utf8"), "<html>ok</html>");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("batch validation and export report each confined workspace file", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "archify-batch-"));
  await fs.mkdir(path.join(directory, "exports"));
  await fs.writeFile(path.join(directory, "valid.json"), JSON.stringify(newDocument("Batch valid")));
  await fs.writeFile(path.join(directory, "invalid.json"), "{}");
  const server = await createEditorServer({ directory });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const list = await (await fetch(`${base}/api/workspace`)).json(), session = await (await fetch(`${base}/api/document?id=${list.files.find((file) => file.name === "valid.json").id}`)).json();
    const run = (operation) => fetch(`${base}/api/batch`, { method: "POST", headers: { "Content-Type": "application/json", "X-Editor-Token": session.token }, body: JSON.stringify({ ids: list.files.map((file) => file.id), operation, destination: "exports", overwrite: false }) });
    const validation = await (await run("validate")).json();
    assert.equal(validation.results.filter((result) => result.status === "ok").length, 1);
    assert.equal(validation.results.filter((result) => result.status === "error").length, 1);
    const exported = await (await run("export")).json();
    assert.equal(exported.results.find((result) => result.name === "valid.json").output, "exports/valid.html");
    assert.match(await fs.readFile(path.join(directory, "exports", "valid.html"), "utf8"), /<svg/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("workspace saves record bounded local versions and restore only against the current revision", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "archify-versions-"));
  await fs.writeFile(path.join(directory, "diagram.json"), JSON.stringify(newDocument("Initial")));
  const server = await createEditorServer({ directory });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const workspace = await (await fetch(`${base}/api/workspace`)).json(), id = workspace.files[0].id;
    const opened = await (await fetch(`${base}/api/document?id=${id}`)).json(), edited = newDocument("Saved version");
    const saved = await (await fetch(`${base}/api/document?id=${id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Editor-Token": opened.token }, body: JSON.stringify({ document: edited, revision: opened.revision }) })).json();
    const listResponse = await fetch(`${base}/api/history?id=${id}`, { headers: { "X-Editor-Token": opened.token } }), list = await listResponse.json();
    assert.equal(listResponse.status, 200); assert.equal(list.entries.length, 1); assert.equal(list.entries[0].operation, "save");
    const restore = (revision) => fetch(`${base}/api/history/restore`, { method: "POST", headers: { "Content-Type": "application/json", "X-Editor-Token": opened.token }, body: JSON.stringify({ id, historyId: list.entries[0].id, revision }) });
    assert.equal((await restore("stale")).status, 409);
    const restored = await (await restore(saved.revision)).json(); assert.equal(restored.document.meta.title, "Saved version");
    assert.equal((await fs.readdir(directory)).includes(".archify-editor-history"), true);
    await fetch(`${base}/api/workspace`).then((response) => response.json()).then((value) => assert.equal(value.files.length, 1));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
