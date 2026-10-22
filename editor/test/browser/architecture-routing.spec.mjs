import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { render } from "../../server.mjs";

test("architecture canvas connections match the exported HTML without rewriting authored geometry", async ({ page }) => {
  const original = JSON.parse(await fs.readFile(new URL("../../../archify/examples/web-app.architecture.json", import.meta.url), "utf8"));
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  async function matchesExport(document) {
    const html = await render(document);
    const exported = await page.evaluate((html) => Array.from(
      new DOMParser().parseFromString(html, "text/html").querySelectorAll("path[data-edge-key]"),
      (edge) => ({ index: edge.getAttribute("data-edge-key"), d: edge.getAttribute("d") }),
    ), html);
    expect(exported).toHaveLength(document.connections.length);
    for (const { index, d } of exported)
      await expect(page.locator(`[data-testid="rf__edge-e:${index}"] .react-flow__edge-path`)).toHaveAttribute("d", d);
  }
  await matchesExport(original);
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  expect(JSON.parse(await page.getByLabel("Diagram JSON").inputValue())).toEqual(original);
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await page.getByRole("button", { name: "Users users", exact: true }).click();
  await page.getByLabel("X", { exact: true }).fill("42");
  await page.getByLabel("X", { exact: true }).press("Tab");
  const moved = structuredClone(original);
  moved.components.find((component) => component.id === "users").pos[0] = 42;
  await matchesExport(moved);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await matchesExport(original);
  expect(errors).toEqual([]);
});

test("an unavailable routing worker reports temporary geometry without blocking document editing", async ({ page }) => {
  await page.route("**/architecture-routing.worker-*.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Architecture route preview failed:");
  await expect(page.getByText("Final routes unavailable; temporary routes shown. See error.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Users users", exact: true }).click();
  await page.getByLabel("X", { exact: true }).fill("42");
  await page.getByLabel("X", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  expect(JSON.parse(await page.getByLabel("Diagram JSON").inputValue()).components[0].pos[0]).toBe(42);
});
