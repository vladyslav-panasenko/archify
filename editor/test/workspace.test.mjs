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
