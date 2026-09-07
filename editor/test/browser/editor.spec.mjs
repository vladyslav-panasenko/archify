import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEditorServer } from "../../server.mjs";

test("edit, undo, download, reopen and render a real architecture document", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sample Web App" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "API Server api" }).click();
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("670");
  // Actual pointer drag at the fitted zoom, then at a second zoom.
  const node = page.locator('.react-flow__node[data-id="c:api"]');
  const before = await node.boundingBox();
  await page.mouse.move(
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    before.x + before.width / 2 + 30,
    before.y + before.height / 2 + 10,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.getByLabel("X", { exact: true })).not.toHaveValue("670");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("670");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("X", { exact: true })).not.toHaveValue("670");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: /zoom in/i }).click();
  const zoomed = await node.boundingBox();
  await page.mouse.move(
    zoomed.x + zoomed.width / 2,
    zoomed.y + zoomed.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    zoomed.x + zoomed.width / 2 + 20,
    zoomed.y + zoomed.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(page.getByLabel("X", { exact: true })).not.toHaveValue("670");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  // A coordinate edit proves the JSON round trip, even when authored routes need repair.
  await page.getByLabel("X", { exact: true }).fill("672");
  await page.getByLabel("X", { exact: true }).press("Tab");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON", exact: true })
    .click();
  const download = await downloading;
  const result = JSON.parse(await fs.readFile(await download.path(), "utf8"));
  const original = JSON.parse(
    await fs.readFile(
      new URL(
        "../../../archify/examples/web-app.architecture.json",
        import.meta.url,
      ),
    ),
  );
  original.components.find((c) => c.id === "api").pos = [672, 300];
  expect(result).toEqual(original);
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "round-trip.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(result)),
    });
  await expect(
    page.getByText("round-trip.json", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "API Server api" }).click();
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("672");
  await page.getByRole("button", { name: "Render HTML", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "endpoint-side-direction",
  );
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("672");
  await page.getByLabel("X", { exact: true }).fill("670");
  await page.getByLabel("X", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "Users users" }).click();
  await page.getByLabel("X", { exact: true }).fill("42");
  await page.getByLabel("X", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "Render HTML", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.frameLocator("iframe").locator("svg").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();
  await page.screenshot({ path: "test-results/editor-desktop.png" });
  expect(errors).toEqual([]);
});

test("invalid JSON stays available and unsupported files do not replace the diagram", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sample Web App" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await page.getByRole("textbox", { name: "Diagram JSON" }).fill("{invalid");
  await page.getByRole("button", { name: "Apply JSON" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Diagram JSON" })).toHaveValue(
    "{invalid",
  );
  await expect(
    page.getByRole("button", { name: "Download JSON" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Discard text" }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "workflow.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"diagram_type":"workflow"}'),
    });
  await expect(page.getByRole("alert")).toContainText("architecture");
  await expect(
    page.getByRole("heading", { name: "Sample Web App" }),
  ).toBeVisible();
});

test("narrow viewport contains the editor and preserves keyboard editing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 850 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sample Web App" }),
  ).toBeVisible();
  const node = page.locator('.react-flow__node[data-id="c:api"]');
  await node.click();
  await node.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("671");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/editor-narrow.png" });
});

test("Escape cancels a drag and a multi-selection moves in one undo step", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sample Web App" }),
  ).toBeVisible();
  const api = page.locator('.react-flow__node[data-id="c:api"]');
  await api.click();
  const rect = await api.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width / 2 + 40,
    rect.y + rect.height / 2,
    { steps: 6 },
  );
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("670");
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await page
    .locator('.react-flow__node[data-id="c:cache"]')
    .click({ modifiers: ["Shift"] });
  await expect(page.locator(".react-flow__node.selected")).toHaveCount(2);
  const box = await api.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2, {
    steps: 6,
  });
  await page.mouse.up();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const doc = JSON.parse(
    await page.getByRole("textbox", { name: "Diagram JSON" }).inputValue(),
  );
  const movedApi = doc.components.find((c) => c.id === "api"),
    movedCache = doc.components.find((c) => c.id === "cache");
  expect(movedApi.pos[0]).toBeGreaterThan(670);
  expect(movedApi.pos[0]).toBe(movedCache.pos[0]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const restored = JSON.parse(
    await page.getByRole("textbox", { name: "Diagram JSON" }).inputValue(),
  );
  expect(restored.components.find((c) => c.id === "api").pos).toEqual([
    670, 300,
  ]);
  expect(restored.components.find((c) => c.id === "cache").pos).toEqual([
    670, 150,
  ]);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
});

test("direct file save survives reload and imported JSON cannot overwrite that file", async ({
  page,
}) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "archify-browser-"));
  const file = path.join(dir, "working.json");
  const original = JSON.parse(
    await fs.readFile(
      new URL(
        "../../../archify/examples/web-app.architecture.json",
        import.meta.url,
      ),
    ),
  );
  await fs.writeFile(file, JSON.stringify(original));
  const server = await createEditorServer({ file });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "Users users" }).click();
    await page.getByLabel("X", { exact: true }).fill("42");
    await page.getByLabel("X", { exact: true }).press("Tab");
    await page.getByRole("button", { name: "Save file", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("JSON saved");
    await page.reload();
    await page.getByRole("button", { name: "Users users" }).click();
    await expect(page.getByLabel("X", { exact: true })).toHaveValue("42");
    const expected = structuredClone(original);
    expected.components[0].pos = [42, 300];
    expect(JSON.parse(await fs.readFile(file, "utf8"))).toEqual(expected);
    await page
      .locator('input[type="file"]')
      .setInputFiles({
        name: "another.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(original)),
      });
    await expect(
      page.getByRole("button", { name: "Save file", exact: true }),
    ).toHaveCount(0);
    expect(JSON.parse(await fs.readFile(file, "utf8"))).toEqual(expected);
  } finally {
    await page.close();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
