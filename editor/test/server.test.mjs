import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEditorServer, render } from "../server.mjs";
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
