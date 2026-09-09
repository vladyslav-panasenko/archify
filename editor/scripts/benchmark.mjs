import fs from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { chromium } from "@playwright/test";
import {
  components,
  moveComponents,
  layoutWarnings,
} from "../src/document.mjs";
import { createEditorServer, render } from "../server.mjs";
const count = 500,
  cols = 25;
export const diagram = {
  schema_version: 1,
  diagram_type: "architecture",
  meta: {
    title: "500-node benchmark",
    viewBox: [3600, 2200],
    quality_profile: "standard",
  },
  components: Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    type: "backend",
    label: `N${i}`,
    pos: [50 + (i % cols) * 140, 80 + Math.floor(i / cols) * 100],
    size: [80, 40],
  })),
  connections: Array.from({ length: count - 1 }, (_, i) =>
    i % cols === cols - 1
      ? null
      : { id: `edge-${i}`, from: `node-${i}`, to: `node-${i + 1}` },
  ).filter(Boolean),
};
const start = performance.now();
for (let i = 0; i < 20; i++) {
  const doc = moveComponents(diagram, new Map([["node-0", [50 + i, 80]]]));
  for (const edge of doc.connections) components(doc);
  layoutWarnings(doc);
}
const projectionMs = performance.now() - start;
const renderStart = performance.now();
const html = await render(diagram);
const renderMs = performance.now() - renderStart;
const server = await createEditorServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch();
let report;
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 940 },
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const opened = performance.now();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "benchmark.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(diagram)),
    });
  await page.locator('[data-id="c:node-499"]').waitFor();
  const openMs = performance.now() - opened;
  const selected = performance.now();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByLabel("Find items and connections").fill("N0");
  await page.locator(".search-result").first().click();
  const selectMs = performance.now() - selected;
  const node = page.locator('[data-id="c:node-0"]'),
    box = await node.boundingBox();
  const dragStart = performance.now();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 60,
    box.y + box.height / 2 + 20,
    { steps: 20 },
  );
  await page.mouse.up();
  const dragMs = performance.now() - dragStart;
  report = {
    nodes: count,
    edges: diagram.connections.length,
    nodeVersion: process.version,
    projection20FramesMs: Math.round(projectionMs),
    renderMs: Math.round(renderMs),
    htmlBytes: Buffer.byteLength(html),
    browserOpenMs: Math.round(openMs),
    browserSearchAndFocusMs: Math.round(selectMs),
    browserDrag20StepsMs: Math.round(dragMs),
  };
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
console.log(JSON.stringify(report, null, 2));
if (process.argv[2])
  await fs.writeFile(process.argv[2], JSON.stringify(report, null, 2) + "\n");
