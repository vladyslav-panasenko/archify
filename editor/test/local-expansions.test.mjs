import test from "node:test";
import assert from "node:assert/strict";
import { newDocument, assertDocument } from "../src/document.mjs";
import { addComment, checkComments, resolveComment } from "../src/comments.mjs";
import { importMermaid, exportMermaid } from "../src/mermaid-interchange.mjs";
import { planRefinement, applyRefinement } from "../src/refinement.mjs";
import { checkExtension, runExtensionCommand } from "../src/extensions.mjs";
import { checkPack, installPack } from "../src/diagram-packs.mjs";
import { migrateArchitectureToV2, addPort, removePort } from "../src/architecture-migration.mjs";

test("comments remain outside documents and expose deleted subjects as orphaned", () => {
  const document = newDocument("Review"), before = structuredClone(document);
  let record = addComment(null, document, { kind: "item", id: "component-1" }, "Check ownership", "Reviewer");
  assert.deepEqual(document, before);
  record = resolveComment(record, document, record.comments[0].id);
  assert.ok(record.comments[0].resolvedAt);
  const changed = structuredClone(document); changed.components[0].id = "replacement";
  assert.equal(checkComments(record, changed).comments[0].orphaned, true);
});

test("Mermaid interchange has deterministic IDs and explicit loss reports", () => {
  const imported = importMermaid("flowchart LR\nclient[Client] -->|calls| api[API]\nclassDef ignored fill:red");
  assert.deepEqual(imported.document.components.map((item) => item.id), ["client", "api"]);
  assert.equal(imported.document.connections[0].label, "calls");
  assert.equal(imported.losses.length, 1);
  imported.document.boundaries = [{ kind: "region", label: "System", wraps: ["client", "api"] }];
  const exported = exportMermaid(imported.document);
  assert.match(exported.text, /client -->\|calls\| api/);
  assert.ok(exported.losses.some((entry) => entry.field === "boundaries"));
});

test("stable-ID refinement reapplies only explicit visual overrides", () => {
  const current = newDocument("Current"), regenerated = newDocument("Regenerated");
  current.components[0].pos = [400, 220]; current.components[0].size = [180, 90];
  regenerated.components[0].label = "New generated label";
  const proposal = planRefinement(current, regenerated), result = applyRefinement(regenerated, proposal);
  assert.deepEqual(result.components[0].pos, [400, 220]);
  assert.deepEqual(result.components[0].size, [180, 90]);
  assert.equal(result.components[0].label, "New generated label");
});

test("declarative extensions require grants and cannot escape document paths", () => {
  const extension = checkExtension({ format: "archify-extension", version: 1, id: "example.labels", name: "Labels", permissions: ["document:write"], commands: [{ id: "rename", label: "Rename", operations: [{ op: "set", path: "/meta/title", value: "Extended" }] }] });
  assert.throws(() => runExtensionCommand(extension, "rename", newDocument(), []), /not granted/);
  assert.equal(runExtensionCommand(extension, "rename", newDocument(), ["document:write"]).meta.title, "Extended");
  assert.throws(() => checkExtension({ ...extension, commands: [{ id: "bad", label: "Bad", operations: [{ op: "set", path: "/__proto__/polluted", value: true }] }] }), /outside/);
});

test("diagram packs validate and require explicit replacement", () => {
  const pack = checkPack({ format: "archify-diagram-pack", version: 1, id: "software.delivery", name: "Software delivery", terms: { component: "Service" }, starters: [{ name: "System", document: newDocument("System") }], templates: [] });
  assert.equal(installPack([], pack).length, 1);
  assert.throws(() => installPack([pack], pack), /replace/);
  assert.equal(installPack([pack], { ...pack, name: "Updated" }, true)[0].name, "Updated");
});

test("architecture v2 migration is explicit and ports clean references", () => {
  const v1 = newDocument("Ports"), migration = migrateArchitectureToV2(v1);
  assert.equal(v1.schema_version, 1); assert.equal(migration.document.schema_version, 2);
  let v2 = addPort(migration.document, "component-1", { id: "http", side: "right", offset: 0.25 });
  v2.components.push({ id: "component-2", type: "backend", label: "API", pos: [400, 120] });
  v2.connections.push({ id: "connection-1", from: "component-1", to: "component-2", fromPort: "http" });
  assertDocument(v2);
  v2 = removePort(v2, "http");
  assert.equal(v2.components[0].ports, undefined); assert.equal(v2.connections[0].fromPort, undefined);
});
