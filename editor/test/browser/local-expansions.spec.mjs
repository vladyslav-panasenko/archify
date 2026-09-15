import { test, expect } from "@playwright/test";

test("local comments remain review metadata and can be resolved", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Comments", exact: true }).click();
  await page.getByLabel("Comment").fill("Verify the public boundary");
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByText("Verify the public boundary")).toBeVisible();
  await page.getByRole("button", { name: "Resolve" }).click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await expect(page.getByLabel("Diagram JSON")).not.toContainText("Verify the public boundary");
});

test("Mermaid import reports unsupported statements and replaces the draft explicitly", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Interchange", exact: true }).click();
  await page.getByLabel("Mermaid flowchart").fill("flowchart LR\nclient[Client] -->|calls| api[API]\nclassDef skipped fill:red");
  await page.getByRole("button", { name: "Import as architecture" }).click();
  await expect(page.getByRole("status")).toContainText("1 unsupported statement");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await expect(page.getByLabel("Diagram JSON")).toContainText('"id": "client"');
});

test("declarative extension grants and pack workflows are visible and bounded", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Extensions", exact: true }).click();
  await page.getByLabel("Install extension manifest").setInputFiles({ name: "rename.extension.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ format: "archify-extension", version: 1, id: "acceptance.rename", name: "Acceptance rename", permissions: ["document:write"], commands: [{ id: "rename", label: "Apply acceptance title", operations: [{ op: "set", path: "/meta/title", value: "Extension changed title" }] }] })) });
  await expect(page.getByText("Acceptance rename", { exact: true })).toBeVisible();
  await page.getByLabel("Grant document:write").check();
  await page.getByRole("button", { name: "Apply acceptance title" }).click();
  await page.getByRole("button", { name: "Diagram packs", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Software delivery" })).toBeVisible();
  await page.getByRole("button", { name: "Apply editor accent" }).first().click();
  await expect(page.locator("html")).toHaveCSS("--pack-accent", "#087b72");
});

test("architecture v2 ports migrate explicitly and appear on the canvas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ports", exact: true }).click();
  await page.getByRole("button", { name: "Migrate architecture v1 → v2" }).click();
  await page.getByRole("button", { name: "Users users", exact: true }).click();
  await page.getByRole("button", { name: "Ports", exact: true }).click();
  await page.getByLabel("Port ID").fill("users-http");
  await page.getByLabel("Offset").fill("0.25");
  await page.getByRole("button", { name: "Add port" }).click();
  await expect(page.locator('.persisted-port[title="users-http"]')).toBeVisible();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await expect(page.getByLabel("Diagram JSON")).toContainText('"schema_version": 2');
});

test("browser-only edition precaches once, reloads offline, and disables compiler actions", async ({ page, context }) => {
  await page.goto("/offline.html");
  await expect(page.getByRole("status")).toContainText("Browser-only offline edition");
  await expect(page.getByRole("button", { name: "Download JSON" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Render HTML" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Check diagram" })).toBeDisabled();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Browser-only offline edition");
});
