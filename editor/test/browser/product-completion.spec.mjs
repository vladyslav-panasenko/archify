import { test, expect } from "@playwright/test";

test("overview and temporary filters preserve JSON while selecting visible items", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Overview map").check();
  await expect(page.locator(".react-flow__minimap")).toBeVisible();
  await page.getByText(/Visibility ·/).click();
  await page.getByLabel("Text", { exact: true }).fill("Users");
  await expect(page.locator(".react-flow__node-component:visible")).toHaveCount(1);
  await page.keyboard.press("Control+A");
  await expect(page.getByLabel("Canvas selection")).toContainText("Users selected");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await expect(page.getByLabel("Diagram JSON")).not.toContainText("visibility");
});

test("starters, explicit migration, help and redacted diagnostics are discoverable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Starters", exact: true }).click();
  await page.getByRole("button", { name: /Workflow.*Open editable starter/ }).click();
  await page.getByRole("button", { name: "Migration", exact: true }).click();
  await page.getByRole("button", { name: "Preview workflow v1 → v2" }).click();
  await expect(page.getByText("1 → 2")).toBeVisible();
  await page.getByRole("button", { name: "Apply migration" }).click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await expect(page.getByLabel("Diagram JSON")).toContainText('"schema_version": 2');
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await page.getByLabel("Search help").fill("conflict");
  await expect(page.getByRole("heading", { name: "Save conflicts" })).toBeVisible();
  await page.getByText("Review diagnostic content").click();
  await expect(page.locator(".properties pre")).toContainText("archify-editor-support-v1");
  await expect(page.locator(".properties pre")).not.toContainText("X-Editor-Token");
});

test("shortcut preferences reject conflicts and update commands without editing JSON", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const before = await page.getByLabel("Diagram JSON").inputValue();
  await page.getByRole("button", { name: "Shortcuts", exact: true }).click();
  await page.getByLabel("Commands").fill("Mod+L");
  await page.getByRole("button", { name: "Save shortcuts" }).click();
  await page.keyboard.press("Control+L");
  await expect(page.getByRole("dialog", { name: "Commands" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await expect(page.getByLabel("Diagram JSON")).toHaveValue(before);
});

test("panel dividers, complete context actions and delivery formats are discoverable", async ({ page }) => {
  await page.goto("/");
  const divider = page.getByRole("separator", { name: "Resize component outline" });
  await divider.focus(); await divider.press("ArrowRight");
  await expect(divider).toHaveAttribute("aria-valuenow", "236");
  await page.locator(".react-flow__node-component").first().click({ button: "right" });
  await expect(page.getByRole("dialog", { name: "Component actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Duplicate selection" })).toBeEnabled();
  await page.getByRole("button", { name: "Close actions" }).click();
  await page.getByRole("button", { name: "Render HTML", exact: true }).click();
  await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / save PDF" })).toBeVisible();
  await expect(page.getByLabel("PNG scale")).toHaveValue("1");
  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  await expect((await png).suggestedFilename()).toMatch(/-1x\.png$/);
});
