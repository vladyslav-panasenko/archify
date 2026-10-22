import test from "node:test";
import assert from "node:assert/strict";
import { architectureRoutes } from "../src/architecture-routing.mjs";
import { render } from "../server.mjs";
import { parse } from "parse5";
import fs from "node:fs/promises";

function exportedPaths(html) {
  const paths = new Map();
  function visit(node) {
    const attrs = Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
    if (node.tagName === "path" && attrs["data-edge-key"] !== undefined)
      paths.set(Number(attrs["data-edge-key"]), attrs.d);
    for (const child of node.childNodes || []) visit(child);
  }
  visit(parse(html));
  return paths;
}

test("architecture canvas preserves off-center ports, inferred sides and authored return waypoints", async () => {
  const document = {
    schema_version: 2,
    diagram_type: "architecture",
    meta: { title: "Routing parity", output: "diagram.html" },
    components: [
      { id: "source", type: "backend", label: "Source", pos: [100, 80], size: [160, 80],
        ports: [{ id: "out", side: "bottom", offset: 0.25 }] },
      { id: "store", type: "database", label: "Store", pos: [100, 300], size: [160, 80],
        ports: [{ id: "in", side: "top", offset: 0.75 }] },
      { id: "worker", type: "backend", label: "Worker", pos: [500, 300], size: [160, 80] },
    ],
    connections: [
      { from: "source", to: "store", fromPort: "out", toPort: "in", label: "write" },
      { from: "store", to: "worker", label: "process" },
      { from: "worker", to: "source", fromSide: "bottom", toSide: "left",
        via: [[580, 460], [40, 460], [40, 120]] },
    ],
  };
  const before = structuredClone(document);
  const routes = architectureRoutes(document);
  assert.deepEqual(document, before);
  assert.deepEqual(routes[0].points[0], [140, 160]);
  assert.deepEqual(routes[0].points.at(-1), [220, 300]);
  for (const point of document.connections[2].via)
    assert.ok(routes[2].points.some((p) => p.every((n, i) => n === point[i])));
  const paths = exportedPaths(await render(document));
  assert.equal(paths.size, routes.length);
  routes.forEach((route, index) => assert.equal(route.d, paths.get(index)));
});

test("architecture canvas matches complete-scene routing for representative boundary and grid diagrams", async () => {
  for (const file of ["web-app.architecture.json", "production-deployment.architecture.json"]) {
    const document = JSON.parse(await fs.readFile(new URL(`../../archify/examples/${file}`, import.meta.url), "utf8"));
    const before = structuredClone(document);
    const routes = architectureRoutes(document);
    const paths = exportedPaths(await render(document));
    assert.equal(paths.size, routes.length, file);
    routes.forEach((route, index) => assert.equal(route.d, paths.get(index), `${file}: connection ${index}`));
    assert.deepEqual(document, before);
  }
});
