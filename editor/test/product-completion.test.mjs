import test from "node:test";
import assert from "node:assert/strict";
import { newDocument, serialize } from "../src/document.mjs";
import { assertResourceLimits, documentLimits } from "../src/resource-limits.mjs";
import { importedSession } from "../src/session-identity.mjs";
import { createRequestGeneration } from "../src/request-generation.mjs";
import { compilerProblems } from "../src/problems.mjs";
import { createDiagram } from "../src/topology.mjs";
import { migrateWorkflowToV2 } from "../../archify/renderers/workflow/workflow-compiler.mjs";
import { supportBundle } from "../src/support-bundle.mjs";
import { exportPresets, importPresets } from "../src/layout-presets.mjs";
import { visibleNodeIds } from "../src/visibility.mjs";
import { defaultShortcuts, validateShortcuts, matchesShortcut } from "../src/shortcuts.mjs";
import { exportCheckpointBundle, importCheckpointBundle } from "../src/checkpoints.mjs";

test("imports receive stable independent recovery identities", () => {
  const base = { token: "secret", workspace: true, recoveryKey: "file-a" };
  const first = importedSession(base, newDocument(), "same.json", "one");
  const second = importedSession(base, newDocument(), "same.json", "two");
  assert.equal(first.recoveryKey, "import:one");
  assert.equal(second.recoveryKey, "import:two");
  assert.notEqual(first.recoveryKey, second.recoveryKey);
  assert.equal(first.revision, null);
  assert.equal(first.workspaceId, null);
});

test("portable recovery bundles validate versions, limits and collisions", () => {
  const entry = { id: "one", name: "Before", created: new Date(0).toISOString(), document: newDocument() };
  const bundle = exportCheckpointBundle([entry]);
  assert.deepEqual(importCheckpointBundle([], bundle), [entry]);
  assert.throws(() => importCheckpointBundle([entry], bundle), /already exist/);
  assert.deepEqual(importCheckpointBundle([entry], bundle, true), [entry]);
  assert.throws(() => importCheckpointBundle([], { ...bundle, version: 2 }), /version 1/);
});

test("custom shortcuts reject conflicts, reset cleanly and match cross-platform Mod keys", () => {
  assert.deepEqual(validateShortcuts({}), defaultShortcuts);
  assert.throws(() => validateShortcuts({ save: "Mod+K" }), /conflicts/);
  assert.throws(() => validateShortcuts({ save: "Alt+S" }), /must use/);
  assert.equal(matchesShortcut({ ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: "s" }, "Mod+S"), true);
  assert.equal(matchesShortcut({ ctrlKey: false, metaKey: true, shiftKey: true, altKey: false, key: "z" }, "Mod+Shift+Z"), true);
});

test("temporary visibility filters combine type, text and selected neighborhood", () => {
  const document = newDocument();
  document.components.push({ id: "database", type: "database", label: "Orders", pos: [300, 120] });
  document.connections.push({ from: "component-1", to: "database" });
  assert.deepEqual([...visibleNodeIds(document, { text: "orders", type: "", neighbors: false })], ["database"]);
  assert.deepEqual([...visibleNodeIds(document, { text: "", type: "database", neighbors: false })], ["database"]);
  assert.deepEqual([...visibleNodeIds(document, { text: "", type: "", neighbors: true }, ["component-1"])], ["component-1", "database"]);
  assert.equal(serialize(document).includes("visibility"), false);
});

test("layout presets import and export with explicit duplicate handling", () => {
  const preset = { name: "Review", settings: { mode: "grid", direction: "right", gap: 60, gridSize: 10, snap: false, smartSnap: true } };
  const bundle = exportPresets([preset]);
  assert.deepEqual(importPresets([], bundle), [preset]);
  assert.throws(() => importPresets([preset], bundle), /already exist/);
  assert.deepEqual(importPresets([preset], { ...bundle, presets: [{ ...preset, settings: { ...preset.settings, gap: 80 } }] }, true)[0].settings.gap, 80);
});

test("late render results cannot replace a newer draft or document", () => {
  const gate = createRequestGeneration();
  const first = gate.begin("doc-a", "revision-1");
  assert.equal(gate.current(first, "doc-a", "revision-1"), true);
  const second = gate.begin("doc-a", "revision-2");
  assert.equal(gate.current(first, "doc-a", "revision-1"), false);
  assert.equal(gate.current(second, "doc-a", "revision-2"), true);
  gate.invalidate();
  assert.equal(gate.current(second, "doc-a", "revision-2"), false);
});

test("resource boundaries run without recursion and canonical export stays stable", () => {
  let deep = {};
  for (let i = 0; i <= documentLimits.depth; i++) deep = { child: deep };
  assert.throws(() => assertResourceLimits(deep), /nesting exceeds/);
  const shared = { value: "kept twice" };
  assert.doesNotThrow(() => assertResourceLimits({ left: shared, right: shared }));
  assert.equal(serialize(newDocument()).endsWith("\n"), true);
  assert.equal(serialize(newDocument()).includes("\r\n"), false);
});

test("compiler diagnostics retain severity and align paths with canvas subjects", () => {
  const document = newDocument();
  const [warning, error] = compilerProblems(document, [
    { code: "route", severity: "warning", message: "Route", subject: { collection: "components", index: 0 } },
    { code: "document", severity: "error", message: "Document" },
  ]);
  assert.equal(warning.severity, "warning");
  assert.equal(warning.path, "/components/0");
  assert.deepEqual(warning.ids, ["component-1"]);
  assert.equal(error.severity, "error");
  assert.equal(error.path, "");
});

test("workflow migration is explicit, produces a valid v2 copy and retains the original", () => {
  const original = createDiagram("workflow", "Migration");
  original.meta.note = undefined;
  const before = serialize(original);
  const migration = migrateWorkflowToV2(original);
  assert.equal(migration.document.schema_version, 2);
  assert.equal(serialize(original), before);
  assert.equal(original.schema_version, 1);
  assert.notEqual(migration.document, original);
});

test("all five starters validate and support bundles exclude sensitive content", async () => {
  for (const type of ["architecture", "workflow", "dataflow", "lifecycle", "sequence"])
    assert.doesNotThrow(() => assertResourceLimits(createDiagram(type, `Starter ${type}`)));
  const document = newDocument("Sensitive title");
  document.meta.repository = { url: "https://secret.invalid/repo", revision: "private" };
  const bundle = supportBundle({
    session: { name: "diagram.json", token: "secret-token", revision: "secret-revision", recoveryKey: "secret-key" },
    document,
    errors: ["bounded failure"],
    notice: "Ready",
    userAgent: "test browser",
  });
  const text = JSON.stringify(bundle);
  assert.match(text, /architecture/);
  assert.doesNotMatch(text, /Sensitive title|secret-token|secret-revision|secret-key|secret\.invalid/);
});
