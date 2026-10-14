import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createEditorServer } from "../server.mjs";
import { newDocument } from "../src/document.mjs";
import { newPublication, movePublicationDiagram, removePublicationDiagram, setPublicationLink, publicationSourcesClean, publicationNodes } from "../src/publication-authoring.mjs";

const manifest = () => ({
  schema_version: 1, title: "Linked system", output: "reading.html", initial_diagram: "overview",
  diagrams: [
    { id: "overview", label: "Overview", source: "diagrams/A.json" },
    { id: "detail", label: "Detail", source: "diagrams/B.json", c4_level: "Container" },
  ],
  links: [{ from: { diagram: "overview", component: "component-1" }, to: { diagram: "detail" } }],
});

test("publication edits preserve free links, replace one optional target, and remove dangling links", () => {
  const original = manifest();
  const initial = newPublication(original.diagrams[0]);
  assert.equal(initial.initial_diagram, "overview");
  assert.equal(initial.diagrams[0].c4_level, undefined);
  assert.deepEqual(initial.links, []);
  const reordered = movePublicationDiagram(original, "detail", -1);
  assert.deepEqual(reordered.diagrams.map((entry) => entry.id), ["detail", "overview"]);
  assert.equal(reordered.initial_diagram, "overview");
  assert.deepEqual(reordered.links, original.links);
  const replaced = setPublicationLink(original, "overview", "component-1", "overview");
  assert.equal(replaced.links.length, 1);
  assert.equal(replaced.links[0].to.diagram, "overview");
  assert.deepEqual(setPublicationLink(replaced, "overview", "component-1", "").links, []);
  const cycle = setPublicationLink(original, "detail", "component-1", "overview");
  const removed = removePublicationDiagram(cycle, "overview");
  assert.equal(removed.initial_diagram, "detail");
  assert.deepEqual(removed.links, []);
  assert.equal(original.diagrams.length, 2);
  assert.equal(original.links.length, 1);
  assert.throws(() => removePublicationDiagram(removed, "detail"), /at least one/);
});

test("only referenced applied or raw diagram drafts block publication rendering", () => {
  const diagrams = [{ workspaceId: "a" }, { workspaceId: "b" }];
  assert.equal(publicationSourcesClean(diagrams, [{ id: "unrelated", dirty: true }]), true);
  assert.equal(publicationSourcesClean(diagrams, [{ id: "a", dirty: true }]), false);
  assert.equal(publicationSourcesClean(diagrams, [{ id: "a", dirty: false }]), true);
  for (const [type, key] of Object.entries({ architecture: "components", workflow: "nodes", sequence: "participants", dataflow: "nodes", lifecycle: "states", erd: "entities", tree: "nodes", class: "types", timeline: "events", waterfall: "spans" }))
    assert.deepEqual(publicationNodes({ diagram_type: type, [key]: [{ id: "source" }] }), [{ id: "source" }]);
});

async function fixture(run) {
  const directory = await fs.mkdtemp(path.resolve("publication-test-"));
  const project = path.join(directory, "project");
  await fs.mkdir(path.join(project, "books", "diagrams"), { recursive: true });
  const original = JSON.stringify(newDocument("Overview"));
  await fs.writeFile(path.join(project, "books", "diagrams", "A.json"), original);
  await fs.writeFile(path.join(project, "books", "diagrams", "B.json"), JSON.stringify(newDocument("Detail")));
  await fs.writeFile(path.join(project, "books", "00-publication.json"), JSON.stringify(manifest()));
  const server = await createEditorServer({ directory: project });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const session = await (await fetch(`${base}/api/document`)).json();
    const workspace = await (await fetch(`${base}/api/workspace`)).json();
    const id = workspace.files.find((file) => file.type === "publication").id;
    const request = async (endpoint, body, token = session.token) => {
      const response = await fetch(`${base}${endpoint}`, {
        ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
        headers: { "Content-Type": "application/json", "X-Editor-Token": token },
      });
      return { status: response.status, data: await response.json() };
    };
    await run({ directory, project, original, session, workspace, id, request });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("workspace publications open separately; explicit saves validate references and check revisions", async () => {
  await fixture(async ({ project, original, session, id, request }) => {
    assert.equal(session.rawOnly, undefined);
    assert.equal(session.name, "books/diagrams/A.json");
    assert.equal((await request(`/api/publication?id=${id}`, undefined, "wrong")).status, 403);
    const opened = await request(`/api/publication?id=${id}`);
    assert.equal(opened.status, 200, JSON.stringify(opened.data));
    assert.equal(opened.data.diagrams[0].workspaceId, session.workspaceId);
    assert.equal(opened.data.diagrams[0].document.meta.title, "Overview");
    const body = { name: "books/00-publication.json", manifest: { ...manifest(), title: "Changed title" }, revision: opened.data.revision };
    assert.equal((await request("/api/publication/save", { ...body, revision: null })).status, 409);
    assert.equal((await request("/api/publication/save", body)).status, 200);
    assert.equal((await request("/api/publication/save", body)).status, 409);
    assert.equal(await fs.readFile(path.join(project, "books", "diagrams", "A.json"), "utf8"), original);
    assert.equal(JSON.parse(await fs.readFile(path.join(project, "books", "00-publication.json"), "utf8")).title, "Changed title");
    const invalid = manifest();
    invalid.links[0].from.component = "missing";
    assert.equal((await request("/api/publication/save", { name: "books/new.json", manifest: invalid })).status, 400);
    await assert.rejects(fs.stat(path.join(project, "books", "new.json")), { code: "ENOENT" });
    invalid.links = [];
    invalid.diagrams[0].source = "../outside.json";
    assert.equal((await request("/api/publication/save", { name: "books/new.json", manifest: invalid })).status, 400);
    assert.equal((await request("/api/publication/save", { name: "../escape.json", manifest: manifest() })).status, 400);
    const valid = await request("/api/publication/save", { name: "books/new.json", manifest: manifest() });
    assert.equal(valid.status, 200);
    assert.equal(valid.data.name, "books/new.json");
  });
});

test("publication sources and output are confined and duplicate physical sources cannot be saved", async () => {
  await fixture(async ({ directory, project, id, request }) => {
    const source = path.join(project, "books", "diagrams", "A.json");
    await fs.link(source, path.join(project, "books", "diagrams", "alias.json"));
    const duplicate = manifest(); duplicate.diagrams[1].source = "diagrams/alias.json";
    assert.equal((await request("/api/publication/save", { name: "books/duplicate.json", manifest: duplicate })).status, 400);
    await assert.rejects(fs.stat(path.join(project, "books", "duplicate.json")), { code: "ENOENT" });
    await fs.mkdir(path.join(directory, "outside"));
    await fs.writeFile(path.join(directory, "outside", "outside.json"), JSON.stringify(newDocument("Outside")));
    await fs.symlink(path.join(directory, "outside"), path.join(project, "books", "redirect"), process.platform === "win32" ? "junction" : "dir");
    const redirected = manifest(); redirected.diagrams[1].source = "redirect/outside.json";
    assert.equal((await request("/api/publication/save", { name: "books/redirected.json", manifest: redirected })).status, 400);
    const changed = manifest(); changed.output = "redirect/reading.html";
    const opened = (await request(`/api/publication?id=${id}`)).data;
    const saved = (await request("/api/publication/save", { name: opened.name, manifest: changed, revision: opened.revision })).data;
    const rendered = await request("/api/publication/render", { id, revision: saved.revision, sourceRevisions: Object.fromEntries(saved.diagrams.map((entry) => [entry.id, entry.revision])) });
    assert.equal(rendered.status, 400);
    await assert.rejects(fs.stat(path.join(directory, "outside", "reading.html")), { code: "ENOENT" });
  });
});

test("publication rendering exports saved sources and rejects stale manifest/source revisions without replacing output", async () => {
  await fixture(async ({ project, id, request }) => {
    const opened = (await request(`/api/publication?id=${id}`)).data;
    const body = { id, revision: opened.revision, sourceRevisions: Object.fromEntries(opened.diagrams.map((entry) => [entry.id, entry.revision])) };
    assert.equal((await request("/api/publication/render", { ...body, sourceRevisions: {} })).status, 409);
    const rendered = await request("/api/publication/render", body);
    assert.equal(rendered.status, 200, rendered.data.error);
    assert.equal(rendered.data.diagramCount, 2);
    assert.equal(rendered.data.linkCount, 1);
    assert.equal(rendered.data.output, "books/reading.html");
    assert.match(rendered.data.html, /Linked system/);
    const output = path.join(project, "books", "reading.html");
    assert.equal(await fs.readFile(output, "utf8"), rendered.data.html);
    await fs.writeFile(path.join(project, "books", "diagrams", "B.json"), JSON.stringify(newDocument("External change")));
    assert.equal((await request("/api/publication/render", body)).status, 409);
    assert.equal(await fs.readFile(output, "utf8"), rendered.data.html);
    const refreshed = (await request(`/api/publication?id=${id}`)).data;
    await fs.writeFile(path.join(project, "books", "00-publication.json"), JSON.stringify({ ...manifest(), title: "External manifest" }));
    assert.equal((await request("/api/publication/render", { ...body, sourceRevisions: Object.fromEntries(refreshed.diagrams.map((entry) => [entry.id, entry.revision])) })).status, 409);
    assert.equal(await fs.readFile(output, "utf8"), rendered.data.html);
    assert.deepEqual((await fs.readdir(path.join(project, "books"))).sort(), ["00-publication.json", "diagrams", "reading.html"]);
  });

});

test("publications can include compiler-supported diagrams that the canvas opens read-only", async () => {
  await fixture(async ({ project, request }) => {
    const tree = JSON.parse(await fs.readFile(new URL("../../archify/examples/payment-platform.tree.json", import.meta.url), "utf8"));
    await fs.writeFile(path.join(project, "books", "diagrams", "Tree.json"), JSON.stringify(tree));
    const candidate = manifest();
    candidate.diagrams[1].source = "diagrams/Tree.json";
    candidate.links.push({ from: { diagram: "detail", component: tree.nodes[0].id }, to: { diagram: "overview" } });
    const saved = await request("/api/publication/save", { name: "books/tree-publication.json", manifest: candidate });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.diagrams[1].document.diagram_type, "tree");
    const opened = await request(`/api/document?id=${saved.data.diagrams[1].workspaceId}`);
    assert.equal(opened.data.rawOnly, true);
    assert.equal(JSON.parse(opened.data.sourceText).diagram_type, "tree");
  });
});
