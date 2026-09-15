import test from "node:test";
import assert from "node:assert/strict";
import { newDocument, assertDocument } from "../src/document.mjs";
import { addComment, checkComments, resolveComment } from "../src/comments.mjs";
import { importMermaid, exportMermaid } from "../src/mermaid-interchange.mjs";
import { planRefinement, applyRefinement } from "../src/refinement.mjs";
import { checkExtension, runExtensionCommand, runExtensionAdapter } from "../src/extensions.mjs";
import { checkPack, installPack } from "../src/diagram-packs.mjs";
import { migrateArchitectureToV2, addPort, removePort } from "../src/architecture-migration.mjs";
import { browserCandidates, desktopOptions, launchDesktop } from "../desktop/launcher.mjs";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyUpdateManifest, verifyUpdateSignature } from "../desktop/trusted-update.mjs";
import { writeOfflineServiceWorker } from "../scripts/offline-service-worker.mjs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
  assert.throws(() => checkExtension({ ...extension, commands: [{ id: "bad", label: "Bad", operations: [{ op: "set", path: "/meta/__proto__/polluted", value: true }] }] }), /unsafe/);
  const adapter = checkExtension({ ...extension, adapters: [{ id: "to-workflow", label: "To workflow", from: "architecture", to: "workflow", operations: [{ op: "set", path: "/diagram_type", value: "workflow" }] }] });
  assert.equal(runExtensionAdapter(adapter, "to-workflow", newDocument(), ["document:write"]).diagram_type, "workflow");
});

test("diagram packs validate and require explicit replacement", () => {
  const pack = checkPack({ format: "archify-diagram-pack", version: 1, id: "software.delivery", name: "Software delivery", theme: { accent: "#087b72" }, terms: { component: "Service" }, starters: [{ name: "System", document: newDocument("System") }], templates: [] });
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

test("desktop launcher validates arguments and owns the loopback server lifecycle", async () => {
  assert.throws(() => desktopOptions(["--file", "a.json", "--directory", "."]), /either/);
  assert.ok(browserCandidates("win32", { PROGRAMFILES: "C:\\Apps" })[0].endsWith("msedge.exe"));
  const desktop = await launchDesktop(["--no-launch"]);
  try { const response = await fetch(desktop.url); assert.equal(response.status, 200); }
  finally { await desktop.close(); }
});

test("trusted local updates bind the archive checksum to an Ed25519 signature", () => {
  const archive = Buffer.from("immutable archive"), sha256 = "61AE07798ABB4ECC73A3152D9CD3277A57CEF725A28AE051F429B22E0590DEC2";
  const manifest = { format: "archify-desktop-release", version: 1, productVersion: "0.2.0", bytes: archive.length, sha256 };
  assert.equal(verifyUpdateManifest(manifest, archive).productVersion, "0.2.0");
  const { privateKey, publicKey } = generateKeyPairSync("ed25519"), signature = sign(null, Buffer.from(JSON.stringify(manifest)), privateKey);
  assert.equal(verifyUpdateSignature(manifest, signature, publicKey), true);
  assert.throws(() => verifyUpdateManifest(manifest, Buffer.from("changed")), /does not match/);
});

test("offline builds precache every emitted hashed asset on first install", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "archify-offline-build-"));
  try {
    await fs.mkdir(path.join(directory, "assets"));
    await fs.writeFile(path.join(directory, "offline.html"), "offline");
    await fs.writeFile(path.join(directory, "offline.webmanifest"), "{}");
    await fs.writeFile(path.join(directory, "assets", "offline-abc.js"), "js");
    await fs.writeFile(path.join(directory, "index.html"), "server-only");
    const result = await writeOfflineServiceWorker(directory);
    assert.deepEqual(result.files, ["./assets/offline-abc.js", "./offline.html", "./offline.webmanifest"]);
    const source = await fs.readFile(path.join(directory, "offline-sw.js"), "utf8");
    assert.match(source, /assets\/offline-abc\.js/);
    assert.doesNotMatch(source, /index\.html/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
