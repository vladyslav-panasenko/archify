import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { createEditorServer } from "../../server.mjs";
import { newDocument } from "../../src/document.mjs";

test("visual publication authoring saves a manifest, links components, and preserves diagram drafts in tabs", async ({ page }) => {
  const directory = await fs.mkdtemp(path.resolve("publication-browser-"));
  await fs.writeFile(path.join(directory, "A.json"), JSON.stringify(newDocument("Overview")));
  await fs.writeFile(path.join(directory, "B.json"), JSON.stringify(newDocument("Detail")));
  const server = await createEditorServer({ directory });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const panel = page.getByRole("dialog", { name: "Publication authoring" });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "Publication", exact: true }).click();
    await panel.getByLabel("Diagram ID", { exact: true }).fill("overview");
    await panel.getByLabel("Diagram source").selectOption({ label: "A.json" });
    await panel.getByRole("button", { name: "Create publication draft" }).click();
    await panel.getByLabel("Publication title").fill("System handbook");
    await panel.getByLabel("Diagram ID", { exact: true }).fill("detail");
    await panel.getByLabel("Diagram source").selectOption({ label: "B.json" });
    await panel.getByRole("button", { name: "Add publication diagram" }).click();
    await panel.getByLabel("Optional C4 level").fill("Container");
    await panel.getByLabel("Initial diagram").selectOption("detail");
    await panel.getByRole("button", { name: "Move detail up", exact: true }).click();
    await panel.getByRole("button", { name: "Overview (overview)", exact: true }).click();
    await panel.getByLabel("Source component").selectOption("component-1");
    await panel.getByLabel("Target diagram").selectOption("detail");
    await panel.getByRole("button", { name: "Save publication", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("Manifest saved");
    let saved = JSON.parse(await fs.readFile(path.join(directory, "publication.json"), "utf8"));
    expect(saved.diagrams.map((entry) => entry.id)).toEqual(["detail", "overview"]);
    expect(saved.initial_diagram).toBe("detail");
    expect(saved.diagrams[0].c4_level).toBe("Container");
    expect(saved.links).toEqual([{ from: { diagram: "overview", component: "component-1" }, to: { diagram: "detail" } }]);
    await panel.getByRole("button", { name: "Render publication", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("Published 2 diagrams and 1 links", { timeout: 15000 });
    await expect(panel.getByTitle("Publication preview")).toBeVisible();
    await expect(panel.getByTitle("Publication preview")).toHaveAttribute("src", /^blob:/);
    await expect(panel.getByRole("heading", { name: "Session-only publication preview", exact: true })).toBeVisible();
    await expect(panel.getByText(/Copy link inside this preview is not shareable/)).toContainText("open the saved HTML output locally or host it at a stable HTTP(S) URL");
    await expect(page.frameLocator('iframe[title="Publication preview"]').getByRole("tab", { name: /Detail/ })).toHaveAttribute("aria-selected", "true");
    expect(await fs.readFile(path.join(directory, "publication.html"), "utf8")).toContain("System handbook");
    expect(await fs.readFile(path.join(directory, "publication.html"), "utf8")).not.toContain("Session-only publication preview");

    await panel.getByRole("button", { name: "Close publication panel" }).click();
    await page.locator(".react-flow__node-component").first().click();
    await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "JSON", exact: true }).click();
    const raw = (await page.getByLabel("Diagram JSON").inputValue()) + " INVALID";
    await page.getByLabel("Diagram JSON").fill(raw);
    await page.getByRole("button", { name: "Publication", exact: true }).click();
    await expect(panel.getByRole("button", { name: "Render publication", exact: true })).toBeDisabled();
    await panel.getByRole("button", { name: "Close publication panel" }).click();
    await expect(page.getByLabel("Diagram JSON")).toHaveValue(raw);
    await page.getByRole("button", { name: "Discard text", exact: true }).click();
    await page.getByRole("button", { name: "Publication", exact: true }).click();
    await panel.locator("li").filter({ hasText: "Detail (detail)" }).getByRole("button", { name: "Edit diagram", exact: true }).click();
    await expect(panel).toBeHidden();
    await expect(page.getByRole("heading", { name: "Detail", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Open project documents" })).toContainText("A.json");
    await expect(page.getByRole("navigation", { name: "Open project documents" })).toContainText("B.json");
    await page.getByRole("button", { name: "Publication", exact: true }).click();
    await expect(panel.getByRole("button", { name: "Render publication", exact: true })).toBeDisabled();
    await panel.getByRole("button", { name: "Close publication panel" }).click();
    await page.getByRole("navigation", { name: "Open project documents" }).getByRole("button", { name: /^A\.json(?: •)?$/ }).click();
    await page.getByRole("button", { name: "Save file", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("JSON saved");
    await page.getByRole("button", { name: "Publication", exact: true }).click();
    await panel.getByRole("button", { name: "Render publication", exact: true }).click();
    await expect(panel.getByRole("alert")).toContainText("referenced diagram changed");
    await panel.getByRole("button", { name: "Reload publication", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("revisions refreshed");
    await panel.getByRole("button", { name: "Render publication", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("Published 2 diagrams", { timeout: 15000 });

    let release;
    const waiting = new Promise((resolve) => { release = resolve; });
    let entered;
    const started = new Promise((resolve) => { entered = resolve; });
    await page.route("**/api/publication/render", async (route) => {
      entered();
      await waiting;
      await route.fulfill({ json: { ok: true, diagramCount: 2, linkCount: 1, output: "publication.html", html: "<h1>STALE PREVIEW</h1>" } });
    });
    await panel.getByRole("button", { name: "Render publication", exact: true }).click();
    await started;
    await panel.getByLabel("Publication title").fill("New draft title");
    release();
    await expect(panel.getByRole("alert")).toContainText("render discarded because a draft changed");
    await expect(panel.getByTitle("Publication preview")).toHaveCount(0);
    await page.unroute("**/api/publication/render");
    page.once("dialog", (dialog) => dialog.accept());
    await panel.getByRole("button", { name: "Remove detail", exact: true }).click();
    await panel.getByRole("button", { name: "Save publication", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("Manifest saved");
    saved = JSON.parse(await fs.readFile(path.join(directory, "publication.json"), "utf8"));
    expect(saved.initial_diagram).toBe("overview");
    expect(saved.diagrams).toHaveLength(1);
    expect(saved.links).toEqual([]);
    expect(JSON.parse(await fs.readFile(path.join(directory, "B.json"), "utf8")).meta.title).toBe("Detail");
    await panel.getByRole("button", { name: "New publication", exact: true }).click();
    await panel.getByRole("combobox", { name: "Open publication", exact: true }).selectOption({ label: "publication.json" });
    await panel.getByRole("button", { name: "Open publication", exact: true }).click();
    await expect(panel.getByLabel("Publication title")).toHaveValue("New draft title");
  } finally {
    await page.close();
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("offline and standalone editors explicitly require a local workspace for publication authoring", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Publication", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Publication authoring" })).toContainText("Start the local editor with --directory");
  await page.goto("/offline.html");
  await page.getByRole("button", { name: "Publication", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Publication authoring" })).toContainText("unavailable in the browser-only offline edition");
  await expect(page.getByRole("button", { name: "Create publication draft" })).toHaveCount(0);
});

test("opening a read-only referenced diagram retains the publication draft", async ({ page }) => {
  const directory = await fs.mkdtemp(path.resolve("publication-readonly-browser-"));
  await fs.writeFile(path.join(directory, "A.json"), JSON.stringify(newDocument("Overview")));
  await fs.copyFile(new URL("../../../archify/examples/payment-platform.tree.json", import.meta.url), path.join(directory, "Tree.json"));
  const server = await createEditorServer({ directory });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const panel = page.getByRole("dialog", { name: "Publication authoring" });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "Publication", exact: true }).click();
    await panel.getByLabel("Diagram source").selectOption({ label: "A.json" });
    await panel.getByRole("button", { name: "Create publication draft" }).click();
    await panel.getByLabel("Publication title").fill("Retained publication draft");
    await panel.getByLabel("Diagram ID", { exact: true }).fill("tree");
    await panel.getByLabel("Diagram source").selectOption({ label: "Tree.json" });
    await panel.getByRole("button", { name: "Add publication diagram" }).click();
    await panel.locator("li").filter({ hasText: "(tree)" }).getByRole("button", { name: "Edit diagram", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Source opened read-only", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Publication", exact: true }).click();
    await expect(panel.getByLabel("Publication title")).toHaveValue("Retained publication draft");
    await expect(panel.getByRole("button", { name: "Save publication", exact: true })).toBeEnabled();
    await panel.getByRole("button", { name: "Save publication", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("Manifest saved");
  } finally {
    await page.close();
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("new publication source choices are relative to its own folder", async ({ page }) => {
  const directory = await fs.mkdtemp(path.resolve("publication-relative-browser-"));
  await fs.mkdir(path.join(directory, "book", "diagrams"), { recursive: true });
  await fs.writeFile(path.join(directory, "Outside.json"), JSON.stringify(newDocument("Outside")));
  await fs.writeFile(path.join(directory, "book", "diagrams", "A.json"), JSON.stringify(newDocument("Inside")));
  const server = await createEditorServer({ directory });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const panel = page.getByRole("dialog", { name: "Publication authoring" });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "Publication", exact: true }).click();
    await panel.getByLabel("New manifest filename").fill("book\\reading.json");
    await expect(panel.getByLabel("Diagram source")).not.toContainText("Outside.json");
    await panel.getByLabel("Diagram source").selectOption({ label: "book/diagrams/A.json" });
    await panel.getByRole("button", { name: "Create publication draft" }).click();
    await panel.getByRole("button", { name: "Save publication", exact: true }).click();
    await expect(panel.getByRole("status")).toContainText("Manifest saved");
    const saved = JSON.parse(await fs.readFile(path.join(directory, "book", "reading.json"), "utf8"));
    expect(saved.diagrams[0].source).toBe("diagrams/A.json");
  } finally {
    await page.close();
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await fs.rm(directory, { recursive: true, force: true });
  }
});
