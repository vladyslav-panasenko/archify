import test from "node:test";
import assert from "node:assert/strict";
import { snapBox, snapPositions } from "../src/arrangement.mjs";
import { newDocument } from "../src/document.mjs";
export const fixture = () => ({
  ...newDocument(),
  components: [
    { id: "a", type: "backend", label: "A", pos: [100, 100], size: [100, 60] },
    { id: "b", type: "backend", label: "B", pos: [400, 100], size: [100, 60] },
    { id: "c", type: "backend", label: "C", pos: [250, 300], size: [100, 60] },
  ],
  connections: [
    {
      from: "a",
      to: "b",
      label: "HTTP",
      via: [
        [200, 130],
        [250, 130],
        [400, 130],
      ],
    },
  ],
});
test("guides use screen-scaled tolerance, preserve groups and ignore remote spacing neighbors", () => {
  const box = { pos: [251, 100], size: [100, 60] },
    near = [
      { pos: [100, 100], size: [100, 60] },
      { pos: [400, 100], size: [100, 60] },
    ];
  assert.equal(snapBox(box, near).delta[0], -1);
  assert.equal(
    snapBox(
      box,
      near.map((c) => ({ ...c, pos: [c.pos[0], 900] })),
    ).delta[0],
    0,
  );
  assert.equal(
    snapBox({ ...box, pos: [255, 100] }, near, { threshold: 3 }).delta[0],
    0,
  );
  assert.equal(
    snapBox({ ...box, pos: [255, 100] }, near, { threshold: 12 }).delta[0],
    -5,
  );
  assert.deepEqual(snapBox(box, near, { bypass: true }).guides, []);
  const doc = fixture(),
    positions = new Map([
      ["a", [104, 100]],
      ["c", [254, 300]],
    ]),
    result = snapPositions(doc, positions, { threshold: 6 });
  assert.equal(
    result.positions.get("c")[0] - result.positions.get("a")[0],
    150,
  );
  assert.deepEqual(doc.components[0].pos, [100, 100]);
});

import { simplifyRoute } from "../src/segments.mjs";
test("route cleanup preserves shape and metadata; straightening only removes authored waypoints", () => {
  const doc = fixture();
  doc.connections[0].via = [
    [0, 0],
    [10, 0],
    [10, 0],
    [20, 0],
    [10, 0],
    [10, 10],
  ];
  doc.connections[0].labelAt = [5, 8];
  const next = simplifyRoute(doc, 0);
  assert.deepEqual(next.connections[0].via, [
    [0, 0],
    [20, 0],
    [10, 0],
    [10, 10],
  ]);
  assert.deepEqual(next.connections[0].labelAt, [5, 8]);
  assert.deepEqual(next.components, doc.components);
  const straight = simplifyRoute(doc, 0, "straight");
  assert.equal(straight.connections[0].via, undefined);
  assert.equal(straight.connections[0].route, "straight");
  assert.equal(straight.connections[0].label, "HTTP");
  assert.equal(doc.connections[0].via.length, 6);
});

import { boundaryBounds, fitBoundary } from "../src/structure.mjs";
test("boundary fit changes only native padding and computes bounds around members", () => {
  const doc = fixture();
  doc.boundaries = [
    { label: "Cloud", kind: "region", wraps: ["a", "b"], pad: 30 },
  ];
  assert.deepEqual(boundaryBounds(doc, doc.boundaries[0], 10), {
    pos: [90, 90],
    size: [420, 100],
  });
  const next = fitBoundary(doc, 0, 10);
  assert.deepEqual(next.components, doc.components);
  assert.deepEqual(next.connections, doc.connections);
  assert.equal(next.boundaries[0].pad, 10);
  assert.equal(doc.boundaries[0].pad, 30);
  assert.throws(() => fitBoundary(doc, 0, -1));
  assert.throws(() => boundaryBounds(doc, { wraps: ["missing"] }));
});

import { autoLayout } from "../src/auto-layout.mjs";
test("partial layout positions selection around fixed neighbors and preserves routes and locks", () => {
  const doc = fixture();
  const next = autoLayout(doc, ["b"], [], { mode: "anchored", gap: 60 });
  assert.deepEqual(next.components[1].pos, [260, 100]);
  assert.deepEqual(next.components[0], doc.components[0]);
  assert.deepEqual(next.connections, doc.connections);
  const down = autoLayout(doc, ["b"], [], {
    mode: "anchored",
    direction: "down",
    gap: 60,
  });
  assert.deepEqual(down.components[1].pos, [100, 220]);
  assert.deepEqual(
    autoLayout(doc, ["a", "b"], ["a"], { mode: "anchored" }).components[0],
    doc.components[0],
  );
  assert.deepEqual(
    autoLayout(doc, ["c"], [], { mode: "anchored" }).connections,
    doc.connections,
  );
});

import { watchSource } from "../src/source-watch.mjs";
test("source watchers ignore late responses after cleanup and report changes or errors", async () => {
  const events = new EventTarget(),
    results = [];
  let resolve;
  const stop = watchSource({
    url: "/a",
    revision: "a",
    events,
    onResult: (r) => results.push(r),
    fetcher: () => new Promise((r) => (resolve = r)),
  });
  stop();
  resolve({ ok: true, json: async () => ({ revision: "b" }) });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(results, []);
  const active = watchSource({
    url: "/a",
    revision: "a",
    events,
    onResult: (r) => results.push(r),
    fetcher: async () => ({ ok: true, json: async () => ({ revision: "b" }) }),
  });
  await new Promise((r) => setImmediate(r));
  active();
  assert.deepEqual(results, [{ revision: "b" }]);
  const failed = watchSource({
    url: "/a",
    revision: "a",
    events,
    onResult: (r) => results.push(r),
    fetcher: async () => {
      throw new Error("missing");
    },
  });
  await new Promise((r) => setImmediate(r));
  failed();
  assert.equal(results.at(-1).error, "missing");
});

test("source watchers rerun a focus check queued behind the initial request", async () => {
  const events = new EventTarget(), results = [], pending = [];
  const stop = watchSource({
    url: "/a",
    revision: "a",
    events,
    interval: 60000,
    onResult: (result) => results.push(result),
    fetcher: () => new Promise((resolve) => pending.push(resolve)),
  });
  events.dispatchEvent(new Event("focus"));
  assert.equal(pending.length, 1);
  pending.shift()({ ok: true, json: async () => ({ revision: "a" }) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pending.length, 1);
  pending.shift()({ ok: true, json: async () => ({ revision: "b" }) });
  await new Promise((resolve) => setImmediate(resolve));
  stop();
  assert.deepEqual(results, [null, { revision: "b" }]);
});

import { automaticLabelPoint } from "../src/label-placement.mjs";
test("optimized label placement matches exhaustive placement for dense and sparse layouts", () => {
  function reference(point, label, boxes) {
    const w = Math.max(20, label.length * 2.8 + 7),
      h = 10,
      overlap = ([x, y], b) =>
        x + w > b.pos[0] &&
        x - w < b.pos[0] + b.size[0] &&
        y + h > b.pos[1] &&
        y - h < b.pos[1] + b.size[1];
    if (!boxes.some((b) => overlap(point, b))) return point;
    return (
      boxes
        .flatMap((b) => [
          [point[0], b.pos[1] - h - 4],
          [point[0], b.pos[1] + b.size[1] + h + 4],
          [b.pos[0] - w - 4, point[1]],
          [b.pos[0] + b.size[0] + w + 4, point[1]],
        ])
        .filter((p) => !boxes.some((b) => overlap(p, b)))
        .sort(
          (a, b) =>
            Math.hypot(a[0] - point[0], a[1] - point[1]) -
            Math.hypot(b[0] - point[0], b[1] - point[1]),
        )[0] || point
    );
  }
  for (let seed = 1; seed <= 50; seed++) {
    const boxes = Array.from({ length: 30 }, (_, i) => ({
        pos: [(i * 71 + seed * 13) % 600, (i * 113 + seed * 7) % 400],
        size: [40 + seed, 30],
      })),
      point = [boxes[seed % 30].pos[0] + 20, boxes[seed % 30].pos[1] + 10];
    assert.deepEqual(
      automaticLabelPoint(point, "HTTP request", boxes),
      reference(point, "HTTP request", boxes),
    );
  }
});
