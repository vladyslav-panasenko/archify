import test from "node:test";
import assert from "node:assert/strict";
import { newDocument, history, serialize } from "../src/document.mjs";
import { routeAroundObstacles } from "../src/obstacle-routing.mjs";
import { previewBoundaryMembership } from "../src/structure.mjs";
import { internalConnectionIndices, bulkPatchConnections } from "../src/connection-bulk.mjs";
import { actionCapabilities } from "../src/action-capabilities.mjs";
import { commitEditingTransaction } from "../src/editing-transaction.mjs";
import { readSavedHistory, writeSavedHistory } from "../src/saved-history.mjs";
import { formatLocalDate, formatLocalNumber, rtlLimitation } from "../src/localization.mjs";
import { exportTemplateLibrary, importTemplateLibrary, saveTemplate } from "../src/templates.mjs";

test("obstacle routing previews a deterministic route and protects manual geometry", () => {
  const document = newDocument("Routing");
  document.components = [
    { id: "a", type: "backend", label: "A", pos: [20, 100], size: [100, 60] },
    { id: "block", type: "database", label: "Block", pos: [180, 80], size: [100, 100] },
    { id: "b", type: "backend", label: "B", pos: [340, 100], size: [100, 60] },
  ];
  document.connections = [{ id: "edge", from: "a", to: "b" }];
  const routed = routeAroundObstacles(document, 0);
  assert.ok(routed.connections[0].via.length >= 2);
  assert.equal(document.connections[0].via, undefined);
  assert.throws(() => routeAroundObstacles(routed, 0), /manual route/);
});

test("boundary gesture planning changes membership on the preview copy only", () => {
  const document = newDocument("Boundary");
  document.components.push({ id: "b", type: "backend", label: "B", pos: [400, 100], size: [100, 60] });
  document.boundaries = [{ label: "Zone", kind: "region", wraps: ["component-1"], pad: 40 }];
  const moved = structuredClone(document); moved.components[1].pos = [100, 130];
  const preview = previewBoundaryMembership(document, moved, ["b"]);
  assert.deepEqual(preview.changes, [{ id: "b", boundary: "Zone", action: "add" }]);
  assert.deepEqual(document.boundaries[0].wraps, ["component-1"]);
  assert.deepEqual(preview.document.boundaries[0].wraps, ["component-1", "b"]);
});

test("shared connection edits and capabilities are atomic", () => {
  const document = newDocument("Batch");
  document.components.push({ id: "b", type: "backend", label: "B", pos: [300, 100] });
  document.connections = [{ from: "component-1", to: "b", label: "Old" }];
  const indices = internalConnectionIndices(document, ["component-1", "b"]);
  const changed = bulkPatchConnections(document, indices, { label: "Shared" });
  const state = commitEditingTransaction(history(document), changed);
  assert.equal(state.present.connections[0].label, "Shared");
  assert.equal(state.past.length, 1);
  assert.equal(actionCapabilities({ document, selection: ["component-1"], locked: [] }).duplicate.enabled, true);
  assert.throws(() => bulkPatchConnections(document, indices, { madeUp: true }), /Unsupported/);
});

test("saved history is opt-in, revision-bound, validated, bounded, and expires", () => {
  const values = new Map(), storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const document = newDocument("History"), data = { past: [document], future: [] }, now = new Date("2026-01-01T00:00:00Z");
  writeSavedHistory(storage, "doc", "rev", data, now);
  assert.equal(readSavedHistory(storage, "doc", "rev", (value) => value, now.getTime()).past.length, 1);
  assert.equal(readSavedHistory(storage, "doc", "other", (value) => value, now.getTime()), null);
});

test("template libraries preserve categories and require explicit replacement", () => {
  const document = newDocument("Templates"), entries = saveTemplate([], "Service", document, ["component-1"], "Core"), bundle = exportTemplateLibrary(entries);
  assert.equal(importTemplateLibrary([], bundle)[0].category, "Core");
  assert.throws(() => importTemplateLibrary(entries, bundle), /replace/);
  assert.equal(importTemplateLibrary(entries, bundle, true).length, 1);
});

test("locale helpers preserve Unicode-ready formatting and document RTL limits", () => {
  assert.match(formatLocalNumber(1234, "uk-UA"), /1/);
  assert.match(formatLocalDate("2026-01-01T12:00:00Z", "en-US"), /2026/);
  assert.match(rtlLimitation, /left-to-right/);
  assert.match(serialize({ ...newDocument("Архітектура العربية"), meta: { title: "Архітектура العربية" } }), /العربية/);
});
