import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createEditorServer } from "../../server.mjs";
import { newDocument } from "../../src/document.mjs";
test("Save As creates a workspace copy and requires explicit replacement", async ({
  page,
}) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "archify-saveas-ui-"),
  );
  await fs.writeFile(
    path.join(directory, "A.json"),
    JSON.stringify(newDocument("A")),
  );
  const server = await createEditorServer({ directory });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "Save As", exact: true }).click();
    await page.getByLabel("Project filename").fill("B.json");
    await page
      .getByRole("button", { name: "Save as project file", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Saved B.json");
    await expect(
      page.getByRole("combobox", { name: "Project diagram", exact: true }),
    ).toContainText("B.json");
    expect(
      JSON.parse(await fs.readFile(path.join(directory, "B.json"), "utf8")).meta
        .title,
    ).toBe("A");
    await page.getByRole("button", { name: "Save As", exact: true }).click();
    await page.getByLabel("Project filename").fill("A.json");
    await page
      .getByRole("button", { name: "Save as project file", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Replace existing file" }),
    ).toBeVisible();
    await page.screenshot({ path: "test-results/save-as.png" });
    await page.getByRole("button", { name: "Replace existing file" }).click();
    await expect(page.getByRole("status")).toContainText("Saved A.json");
  } finally {
    await page.close();
    await new Promise((r) => server.close(r));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
test("workspace switches preserve applied history and unapplied text independently", async ({
  page,
}) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "archify-project-ui-"),
  );
  for (const name of ["A", "B"])
    await fs.writeFile(
      path.join(directory, `${name}.json`),
      JSON.stringify(newDocument(name)),
    );
  const server = await createEditorServer({ directory });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator(".react-flow__node-component").first().click();
    await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    await page.getByRole("button", { name: "Zoom Out", exact: true }).click();
    const viewA = await page
      .locator(".react-flow__viewport")
      .getAttribute("style");
    const applied = await page.getByLabel("Diagram JSON").inputValue();
    const raw = applied + " INVALID";
    await page.getByLabel("Diagram JSON").fill(raw);
    await page
      .getByRole("combobox", { name: "Project diagram", exact: true })
      .selectOption({ label: "B.json" });
    await expect(page.getByText("B", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Undo", exact: true }),
    ).toBeDisabled();
    await page.locator(".react-flow__node-component").first().click();
    await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "Save file", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("JSON saved");
    expect(
      JSON.parse(await fs.readFile(path.join(directory, "B.json"), "utf8"))
        .components[0].pos,
    ).toEqual([81, 120]);
    await page
      .getByRole("combobox", { name: "Project diagram", exact: true })
      .selectOption({ label: "A.json" });
    await expect(page.locator(".react-flow__viewport")).toHaveAttribute(
      "style",
      viewA,
    );
    await expect(page.getByLabel("Diagram JSON")).toHaveValue(raw);
    await page.getByRole("button", { name: "Discard text" }).click();
    await expect(page.getByLabel("Diagram JSON")).toHaveValue(applied);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    expect(
      JSON.parse(await page.getByLabel("Diagram JSON").inputValue())
        .components[0].pos,
    ).toEqual([80, 120]);
    expect(
      JSON.parse(await fs.readFile(path.join(directory, "A.json"), "utf8"))
        .components[0].pos,
    ).toEqual([80, 120]);
  } finally {
    await page.close();
    await new Promise((r) => server.close(r));
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("external source notification preserves raw text and supports explicit reload", async ({
  page,
}) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "archify-watch-"));
  const file = path.join(directory, "A.json");
  const doc = newDocument("Original");
  await fs.writeFile(file, JSON.stringify(doc));
  const server = await createEditorServer({ directory });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    const raw =
      (await page.getByLabel("Diagram JSON").inputValue()) + " INVALID";
    await page.getByLabel("Diagram JSON").fill(raw);
    doc.meta.title = "External title";
    await fs.writeFile(file, JSON.stringify(doc));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByLabel("Source file changes")).toContainText(
      "Source file changed",
    );
    await expect(page.getByLabel("Diagram JSON")).toHaveValue(raw);
    await expect(
      page.getByRole("button", { name: "Reload source file", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Discard text", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Compare source changes", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Source conflict", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reload source file", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "External title", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Source file changes")).toHaveCount(0);
  } finally {
    await page.close();
    await new Promise((r) => server.close(r));
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("workspace tabs, search, folders, moves, project defaults and batch validation work together", async ({ page }) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "archify-next-workspace-"));
  for (const name of ["A", "B"]) await fs.writeFile(path.join(directory, `${name}.json`), JSON.stringify(newDocument(`${name} searchable ledger`)));
  const server = await createEditorServer({ directory });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator(".workspace-picker select").first().evaluate((select) => {
      select.value = [...select.options].find((option) => option.text === "B.json").value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.getByRole("heading", { name: "B searchable ledger" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Open project documents" })).toContainText("A.json");
    await expect(page.getByRole("navigation", { name: "Open project documents" })).toContainText("B.json");
    await page.getByLabel("Find files and content").fill("ledger");
    await page.getByRole("button", { name: "Search content" }).click();
    await expect(page.getByText("2 project matches")).toBeVisible();
    await page.getByLabel("New folder").fill("Moved");
    await page.getByRole("button", { name: "Create folder" }).click();
    await page.getByLabel("Rename or move current file").fill("Moved/B.json");
    await page.getByRole("button", { name: "Move file" }).click();
    await expect(page.getByRole("navigation", { name: "Open project documents" })).toContainText("Moved/B.json");
    await page.getByText("Shared project defaults", { exact: true }).click();
    await page.getByRole("button", { name: "Save current canvas defaults to project" }).click();
    await expect.poll(async () => fs.readFile(path.join(directory, ".archify-editor.json"), "utf8")).toContain('"version": 1');
    await page.getByRole("button", { name: "Batch", exact: true }).click();
    await page.getByRole("button", { name: "Select all" }).click();
    await page.getByRole("button", { name: "Run validate" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await expect(page.locator("tbody")).toContainText("Valid");
  } finally {
    await page.close(); await new Promise((resolve) => server.close(resolve)); await fs.rm(directory, { recursive: true, force: true });
  }
});
