import { test, expect } from "@playwright/test";
test("layout comparison previews ghost boxes and accepts selected placement with undo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const before = await page.getByLabel("Diagram JSON").inputValue(),
    other = JSON.parse(before);
  other.components[0].pos = [180, 280];
  other.components[1].pos = [80, 90];
  other.components[0].label = "Ignore this label";
  await page
    .getByRole("button", { name: "Compare layout", exact: true })
    .click();
  await page.getByLabel("Compare layout JSON", { exact: true }).setInputFiles({
    name: "layout.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(other)),
  });
  await page.getByRole("checkbox", { name: "Users pos", exact: true }).check();
  await expect(page.locator(".comparison-ghost")).toHaveCount(1);
  await page.screenshot({ path: "test-results/layout-comparison.png" });
  await page
    .getByRole("button", { name: "Accept selected placements" })
    .click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const next = JSON.parse(await page.getByLabel("Diagram JSON").inputValue());
  expect(next.components[0].pos).toEqual([180, 280]);
  expect(next.components[0].label).toBe("Users");
  expect(next.components[1]).toEqual(JSON.parse(before).components[1]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Diagram JSON")).toHaveValue(before);
});
test("JSON suggestions and errors stay unapplied until accepted", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".react-flow__node-component").first().click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await page.getByRole("button", { name: "Locate canvas selection" }).click();
  const text = page.getByLabel("Diagram JSON"),
    before = await text.inputValue();
  await text.evaluate((el) => {
    const p = el.value.indexOf('"external"');
    el.focus();
    el.setSelectionRange(p + 1, p + 1);
    el.dispatchEvent(new Event("select", { bubbles: true }));
  });
  await text.press("ArrowRight");
  await page
    .getByRole("combobox", { name: /Schema suggestions/ })
    .selectOption({ label: '"database"' });
  await page.getByRole("button", { name: "Insert suggestion" }).click();
  expect(JSON.parse(await text.inputValue()).components[0].type).toBe(
    "database",
  );
  await page.getByRole("button", { name: "Apply JSON", exact: true }).click();
  await text.fill(
    (await text.inputValue()).replace('"database"', '"invalid-type"'),
  );
  await expect(
    page.getByRole("button", { name: /Line .*components\/0\/type/ }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Discard text" }).click();
  expect(JSON.parse(await text.inputValue()).components[0].type).toBe(
    "database",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(text).toHaveValue(before);
});
test("templates persist locally, rename and insert with fresh identities", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".react-flow__node-component").first().click();
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page.getByLabel("Template name", { exact: true }).fill("Saved users");
  await page
    .getByRole("button", { name: "Save selection as template" })
    .click();
  await expect(
    page.getByRole("button", { name: "Insert Saved users" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept("Audience"));
  await page.getByRole("button", { name: "Rename Saved users" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page.getByRole("button", { name: "Insert Audience" }).click();
  await expect(page.locator('[data-id="c:users-copy-1"]')).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator('[data-id="c:users-copy-1"]')).toHaveCount(0);
});
test("auto-arrangement previews, cancels and applies one undoable edit", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".react-flow__node-component").first().click();
  await page
    .locator(".react-flow__node-component")
    .nth(1)
    .click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const before = await page.getByLabel("Diagram JSON").inputValue();
  await page.getByRole("button", { name: "Auto-arrange", exact: true }).click();
  await page.getByRole("button", { name: "Preview arrangement" }).click();
  await expect(page.getByLabel("Arrangement preview")).toBeVisible();
  await page.getByRole("button", { name: "Cancel arrangement" }).click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  expect(await page.getByLabel("Diagram JSON").inputValue()).toBe(before);
  await page.getByRole("button", { name: "Auto-arrange", exact: true }).click();
  await page.getByRole("button", { name: "Preview arrangement" }).click();
  await page.screenshot({ path: "test-results/auto-arrange.png" });
  await page.getByRole("button", { name: "Apply arrangement" }).click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await expect(page.getByLabel("Diagram JSON")).not.toHaveValue(before);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Diagram JSON")).toHaveValue(before);
});
