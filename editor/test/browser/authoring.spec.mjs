import { test, expect } from "@playwright/test";

test("mouse reconnection retains routing and Escape cancels a new connection", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Draw / reconnect connections").check();
  const updater = page
    .locator(".react-flow__edge")
    .first()
    .locator(".react-flow__edgeupdater-target");
  const target = page.getByLabel("Connect to Auth Provider bottom", {
    exact: true,
  });
  const a = await updater.boundingBox(),
    b = await target.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const updated = JSON.parse(
    await page.getByLabel("Diagram JSON").inputValue(),
  );
  expect(updated.connections[0]).toMatchObject({
    from: "users",
    to: "auth",
    label: "HTTPS",
    toSide: "bottom",
  });
  const source = await page
    .getByLabel("Connect from Users bottom", { exact: true })
    .boundingBox();
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(source.x + 40, source.y + 30, { steps: 5 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(
    page.getByLabel("Draw / reconnect connections"),
  ).not.toBeChecked();
  expect(
    JSON.parse(await page.getByLabel("Diagram JSON").inputValue()).connections,
  ).toEqual(updated.connections);
});

test("authoring panels remain usable at desktop and narrow widths", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const width of [1440, 760]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "Structure", exact: true }).click();
    await page
      .getByRole("button", { name: "Create boundary", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: "Create boundary", exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `test-results/structure-${width}.png` });
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByRole("button", { name: "Save settings", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: "Save settings", exact: true }),
    ).toBeInViewport();
    await page.screenshot({ path: `test-results/settings-${width}.png` });
  }
  expect(errors).toEqual([]);
});

test("guided views save focus references and render through Archify", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByText("Guided views", { exact: true }).click();
  const form = page.locator("form").filter({
    has: page.getByRole("button", { name: "Create view", exact: true }),
  });
  await form.getByLabel("View label").fill("Entry");
  await form.getByLabel("Users", { exact: true }).check();
  await form.getByRole("button", { name: "Create view", exact: true }).click();
  await page.getByRole("button", { name: "Render HTML", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("checkpoint restore is undoable and can be exported", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Checkpoints", exact: true }).click();
  await page.getByLabel("Checkpoint name").fill("Before");
  await page
    .getByRole("button", { name: "Create checkpoint", exact: true })
    .click();
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await page.getByRole("button", { name: "Users users" }).click();
  await page.getByLabel("X", { exact: true }).fill("90");
  await page.getByLabel("X", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "Checkpoints", exact: true }).click();
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Restore Before", exact: true })
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await page.getByRole("button", { name: "Users users" }).click();
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("90");
  await page.getByRole("button", { name: "Checkpoints", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export Before", exact: true })
    .click();
  await download;
});

test("review shows layout diff and can download reviewed JSON", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Users users" }).click();
  await page.getByLabel("X", { exact: true }).fill("55");
  await page.getByLabel("X", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.locator(".change-entry")).toContainText("pos · layout");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download reviewed JSON", exact: true })
    .click();
  await download;
  await expect(
    page.getByText("No changes since the baseline.", { exact: true }),
  ).toBeVisible();
});

test("keyboard search focuses a connection without editing JSON", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const input = page.getByLabel("Find items and connections");
  await input.fill("read-through");
  await input.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator(".react-flow__edge.selected")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Fit selection", exact: true })
    .click();
});

test("settings update the JSON title and rendered output", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Updated system");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Updated system", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Render HTML", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("new sequence creates messages and activations and renders", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New diagram", exact: true }).click();
  await page.getByLabel("Diagram title").fill("Sequence");
  await page
    .getByRole("combobox", { name: "Diagram type", exact: true })
    .selectOption("sequence");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page
    .getByLabel("Message text", { exact: true })
    .last()
    .fill("Response");
  await page
    .getByRole("button", { name: "Create message", exact: true })
    .click();
  await page.getByText("Activations", { exact: true }).click();
  await page
    .getByRole("button", { name: "Create range", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Render HTML", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("new lifecycle creates a transition and renders", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New diagram", exact: true }).click();
  await page.getByLabel("Diagram title").fill("Lifecycle");
  await page
    .getByRole("combobox", { name: "Diagram type", exact: true })
    .selectOption("lifecycle");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page
    .locator(".properties summary")
    .filter({ hasText: /^Connections$/ })
    .click();
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await page.getByRole("button", { name: "Render HTML", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("new dataflow creates a flow and renders", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New diagram", exact: true }).click();
  await page.getByLabel("Diagram title").fill("Dataflow");
  await page
    .getByRole("combobox", { name: "Diagram type", exact: true })
    .selectOption("dataflow");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page
    .locator(".properties summary")
    .filter({ hasText: /^Connections$/ })
    .click();
  await page.getByLabel("Connection label", { exact: true }).fill("Data");
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await page.getByRole("button", { name: "Render HTML", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("new workflow can add topology and render JSON", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New diagram", exact: true }).click();
  await page.getByLabel("Diagram title").fill("Workflow");
  await page
    .getByRole("combobox", { name: "Diagram type", exact: true })
    .selectOption("workflow");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.getByLabel("Node label", { exact: true }).fill("Next");
  await page.getByRole("button", { name: "Create node", exact: true }).click();
  await page
    .locator(".properties summary")
    .filter({ hasText: /^Connections$/ })
    .click();
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await page.getByRole("button", { name: "Render HTML", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("boundary authoring creates membership and moves its members", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  const form = page
    .locator("details")
    .filter({ has: page.getByText("New boundary", { exact: true }) });
  await form.getByLabel("Boundary label").fill("Team");
  await form.getByLabel("Users", { exact: true }).check();
  await form
    .getByRole("button", { name: "Create boundary", exact: true })
    .click();
  await page.getByText("Team", { exact: true }).last().click();
  const group = page
    .locator("details")
    .filter({ has: page.getByText("Team", { exact: true }) });
  await group.getByLabel("Move X").fill("20");
  await group
    .getByRole("button", { name: "Move members", exact: true })
    .click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const doc = JSON.parse(await page.getByLabel("Diagram JSON").inputValue());
  expect(doc.boundaries.at(-1).wraps).toEqual(["users"]);
  expect(doc.components.find((c) => c.id === "users").pos[0]).toBe(60);
});

test("manual size reset explains removed fields and undo restores them", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Users users" }).click();
  await page.getByLabel("Width", { exact: true }).fill("180");
  await page.getByLabel("Width", { exact: true }).press("Tab");
  await page.getByText("Reset manual layout", { exact: true }).click();
  page.on("dialog", (d) => {
    expect(d.message()).toContain("users.size");
    d.accept();
  });
  await page
    .getByRole("button", { name: "Reset size overrides", exact: true })
    .click();
  await expect(page.getByLabel("Width", { exact: true })).toHaveValue("120");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Width", { exact: true })).toHaveValue("180");
});

test("local locks prevent canvas changes and survive reload without entering JSON", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Users users" }).click();
  await page
    .getByRole("button", { name: "Lock selection", exact: true })
    .click();
  await expect(
    page.locator('[data-id="c:users"] .react-flow__resize-control'),
  ).toHaveCount(0);
  const before = await page.getByLabel("X", { exact: true }).inputValue();
  await page.locator('[data-id="c:users"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("X", { exact: true })).toHaveValue(before);
  await page.reload();
  await page.getByRole("button", { name: "Users users" }).click();
  await expect(
    page.getByRole("button", { name: "Unlock selection", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  expect(await page.getByLabel("Diagram JSON").inputValue()).not.toContain(
    "locked",
  );
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await page
    .getByRole("button", { name: "Unlock selection", exact: true })
    .click();
  await expect(
    page.locator('[data-id="c:users"] .react-flow__resize-control').first(),
  ).toBeVisible();
});

test("mixed bulk values apply together and deletion is undoable", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-id="c:users"]').click();
  await page.locator('[data-id="c:api"]').click({ modifiers: ["Shift"] });
  await expect(page.getByLabel("Selection width")).toHaveAttribute(
    "placeholder",
    "Mixed values",
  );
  await page.getByLabel("Selection width").fill("150");
  await page.getByLabel("Selection width").press("Tab");
  await expect(page.getByLabel("Selection width")).toHaveValue("150");
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete selection", exact: true })
    .click();
  await expect(page.locator('[data-id="c:users"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator('[data-id="c:users"]')).toBeVisible();
});

test("mouse creates a connection and endpoint edits preserve its identity", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Draw / reconnect connections").check();
  const a = page.getByLabel("Connect from Users bottom", { exact: true }),
    b = page.getByLabel("Connect to Worker bottom", { exact: true });
  const ar = await a.boundingBox(),
    br = await b.boundingBox();
  await page.mouse.move(ar.x + ar.width / 2, ar.y + ar.height / 2);
  await page.mouse.down();
  await page.mouse.move(br.x + br.width / 2, br.y + br.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(
    page.getByRole("heading", { name: "users → worker", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "To component", exact: true })
    .selectOption("queue");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const doc = JSON.parse(await page.getByLabel("Diagram JSON").inputValue());
  expect(doc.connections.at(-1)).toMatchObject({
    id: "connection-1",
    from: "users",
    to: "queue",
    fromSide: "bottom",
    toSide: "bottom",
  });
});

test("duplicate and local copy/paste create fresh items and undo once", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Users users" }).click();
  await page.getByText("Copy and duplicate", { exact: true }).click();
  await page
    .getByRole("button", { name: "Copy selection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Paste selection", exact: true })
    .click();
  await expect(page.locator('[data-id="c:users-copy-1"]')).toBeVisible();
  await page
    .getByRole("button", { name: "Duplicate selection", exact: true })
    .click();
  await expect(page.locator('[data-id="c:users-copy-1-copy-1"]')).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator('[data-id="c:users-copy-1-copy-1"]')).toHaveCount(
    0,
  );
});

test("configurable grid snapping applies to dragging and Alt bypasses it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Users users" }).click();
  await page.getByText("Snapping", { exact: true }).click();
  await page.getByLabel("Grid spacing").fill("25");
  await page.getByLabel("Snap to grid", { exact: true }).check();
  const node = page.locator('[data-id="c:users"]');
  async function drag(alt = false) {
    const r = await node.boundingBox();
    if (alt) await page.keyboard.down("Alt");
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width / 2 + 34, r.y + r.height / 2 + 17, {
      steps: 8,
    });
    await page.mouse.up();
    if (alt) await page.keyboard.up("Alt");
  }
  await drag();
  expect(
    Number(await page.getByLabel("X", { exact: true }).inputValue()) % 25,
  ).toBe(0);
  await drag(true);
  expect(
    Number(await page.getByLabel("X", { exact: true }).inputValue()) % 25,
  ).not.toBe(0);
});

test("aligning a selection updates JSON in one undo step", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-id="c:api"]').click();
  await page.locator('[data-id="c:cache"]').click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Align top", exact: true }).click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const doc = JSON.parse(await page.getByLabel("Diagram JSON").inputValue());
  expect(doc.components.find((c) => c.id === "api").pos[1]).toBe(
    doc.components.find((c) => c.id === "cache").pos[1],
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
});
