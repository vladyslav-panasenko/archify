import test from "node:test";
import assert from "node:assert/strict";
import { autoLayout } from "../src/auto-layout.mjs";
import { newDocument } from "../src/document.mjs";
import { moveSegment, routeSegments } from "../src/segments.mjs";
import { layoutProblems } from "../src/document.mjs";
import { compilerProblems } from "../src/problems.mjs";
import {
  readView,
  writeView,
  validView,
  viewStorageKey,
} from "../src/document-view.mjs";
test("document views filter stale selections and bound storage without changing JSON", () => {
  const doc = diagram(),
    before = JSON.stringify(doc),
    data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    },
    view = {
      viewport: { x: 20, y: 30, zoom: 1.2 },
      selection: ["a", "missing"],
      panel: "search",
    };
  for (let i = 0; i < 55; i++)
    assert.equal(writeView(storage, `file-${i}`, view, doc, ["search"]), true);
  assert.equal(JSON.parse(data.get(viewStorageKey)).length, 50);
  assert.equal(readView(storage, "file-0", doc, ["search"]), null);
  assert.deepEqual(readView(storage, "file-54", doc, ["search"]).selection, [
    "a",
  ]);
  assert.equal(
    validView({ ...view, viewport: { x: NaN, y: 0, zoom: 1 } }, doc, [
      "search",
    ]),
    null,
  );
  assert.equal(JSON.stringify(doc), before);
});
test("problems keep stable node references and map compiler paths without guessing unknown subjects", () => {
  const doc = diagram();
  const issues = layoutProblems(doc);
  assert.ok(issues.some((p) => p.ids.includes("a") && p.ids.includes("b")));
  const outside = structuredClone(doc);
  outside.components[0].pos = [-10, 80];
  assert.ok(
    layoutProblems(outside).some(
      (p) => p.kind === "bounds" && p.ids[0] === "a",
    ),
  );
  const mapped = compilerProblems(doc, [
    { message: "bad edge", subject: { path: "/connections/0" } },
    { message: "unknown", subject: { path: "/meta" } },
  ]);
  assert.deepEqual(mapped[0].ids, ["a", "b"]);
  assert.equal(mapped[0].edgeIndex, 0);
  assert.deepEqual(mapped[1].ids, []);
});
test("segment motion edits exactly two coordinates perpendicular to an authored route", () => {
  const doc = diagram();
  doc.connections[0].via = [
    [10, 10],
    [100, 10],
    [100, 90],
  ];
  doc.connections[0].labelAt = [40, 5];
  const next = moveSegment(doc, 0, 0, [999, 35]);
  assert.deepEqual(next.connections[0].via, [
    [10, 35],
    [100, 35],
    [100, 90],
  ]);
  assert.deepEqual(next.connections[0].labelAt, [40, 5]);
  assert.deepEqual(doc.connections[0].via, [
    [10, 10],
    [100, 10],
    [100, 90],
  ]);
  assert.equal(routeSegments(doc.connections[0]).length, 2);
  assert.throws(() => moveSegment(doc, 0, 0, [NaN, 0]));
  assert.equal(
    routeSegments({
      via: [
        [0, 0],
        [1, 1],
      ],
    }).length,
    0,
  );
});
const diagram = () => ({
  ...newDocument(),
  components: ["a", "b", "c"].map((id) => ({
    id,
    type: "backend",
    label: id,
    pos: [20, 80],
    size: [100, 50],
  })),
  connections: [
    { from: "a", to: "b" },
    { from: "b", to: "c" },
  ],
});
test("directed layout follows edges, changes direction and preserves cycles and locks", () => {
  const doc = diagram(),
    ids = ["c", "a", "b"];
  const right = autoLayout(doc, ids, [], {
    mode: "directed",
    direction: "right",
    gap: 80,
  });
  assert.ok(right.components[0].pos[0] < right.components[1].pos[0]);
  assert.ok(right.components[1].pos[0] < right.components[2].pos[0]);
  assert.deepEqual(right.connections, doc.connections);
  const down = autoLayout(doc, ids, [], {
    mode: "directed",
    direction: "down",
    gap: 80,
  });
  assert.ok(down.components[2].pos[1] > down.components[1].pos[1]);
  doc.connections.push({ from: "c", to: "a" });
  assert.deepEqual(
    autoLayout(doc, ids, [], { mode: "directed" }),
    autoLayout(doc, [...ids].reverse(), [], { mode: "directed" }),
  );
  assert.deepEqual(
    autoLayout(doc, ids, ["b"], { mode: "directed" }).components[1],
    doc.components[1],
  );
  assert.throws(() => autoLayout(doc, ids, [], { gap: -1 }));
});

import {
  describeEdit,
  historyEntries,
  jumpHistory,
} from "../src/history-labels.mjs";
import { history, commit } from "../src/document.mjs";
test("history describes edits and preserves redo across bounded jumps", () => {
  const first = diagram();
  let state = history(first);
  const moved = structuredClone(first);
  moved.components[0].pos = [50, 90];
  moved.components[1].pos = [200, 90];
  assert.equal(describeEdit(first, moved), "Move 2 items");
  state = commit(state, moved);
  const routed = structuredClone(moved);
  routed.connections[0].via = [
    [10, 10],
    [100, 10],
  ];
  state = commit(state, routed);
  assert.equal(historyEntries(state)[2].label, "Edit 1 connection route");
  const back = jumpHistory(state, 0);
  assert.equal(back.present, first);
  assert.equal(back.future.length, 2);
  assert.deepEqual(jumpHistory(back, 2), state);
  assert.equal(commit(state, structuredClone(routed)), state);
  assert.equal(commit(back, moved).future.length, 0);
  assert.throws(() => jumpHistory(state, 3));
  for (let i = 0; i < 110; i++) {
    const next = structuredClone(state.present);
    next.meta.title = String(i);
    state = commit(state, next);
  }
  assert.equal(state.past.length, 100);
  assert.equal(historyEntries(state).length, 101);
  assert.deepEqual(jumpHistory(jumpHistory(state, 0), 100), state);
});
