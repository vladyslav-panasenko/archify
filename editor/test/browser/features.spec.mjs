import { test, expect } from '@playwright/test';

test('renderer diagnostics navigate to the affected connection', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'API Server api' }).click();
  await page.getByLabel('X', { exact: true }).fill('672'); await page.getByLabel('X', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'Check diagram' }).click();
  await expect(page.getByRole('alert')).toContainText('endpoint-side-direction');
  await page.getByRole('button', { name: 'Inspect issue 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'auth → api' })).toBeVisible();
  await expect(page.getByLabel('Source side')).toBeVisible();
});

test('waypoints can be added, dragged, deleted and undone', async ({ page }) => {
  await page.goto('/'); await page.locator('.connection-list summary').click();
  await page.getByRole('button', { name: 'users → cdn', exact: true }).click();
  await page.getByRole('button', { name: 'Add waypoint' }).click();
  const handle = page.getByRole('button', { name: 'Move waypoint 1' });
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + 11, box.y + 11); await page.mouse.down(); await page.mouse.move(box.x + 35, box.y - 20, { steps: 8 }); await page.mouse.up();
  await expect(page.getByLabel('Waypoints · [[x, y], …]')).not.toHaveValue('[[145,300]]');
  await handle.focus(); await page.keyboard.press('Delete');
  await expect(handle).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(handle).toBeVisible();
});

test('dragging a label saves labelAt and undo restores automatic placement', async ({ page }) => {
  await page.goto('/');
  const label = page.getByRole('button', { name: 'Move label: HTTPS', exact: true });
  const box = await label.boundingBox();
  await page.mouse.move(box.x + box.width/2, box.y + box.height/2); await page.mouse.down();
  await page.mouse.move(box.x + box.width/2 + 40, box.y + box.height/2 - 20, { steps: 10 }); await page.mouse.up();
  await page.getByRole('button', { name: 'JSON', exact: true }).click();
  const edited = JSON.parse(await page.getByLabel('Diagram JSON').inputValue());
  expect(edited.connections[0].labelAt).toHaveLength(2);
  expect(edited.connections[0].label).toBe('HTTPS');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(JSON.parse(await page.getByLabel('Diagram JSON').inputValue()).connections[0].labelAt).toBeUndefined();
});

test('mouse resizing is one undoable JSON edit and Escape cancels it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Users users' }).click();
  const handle = page.locator('[data-id="c:users"] .react-flow__resize-control.bottom.right.handle');
  const rect = await handle.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down(); await page.mouse.move(rect.x + 35, rect.y + 25, { steps: 10 }); await page.mouse.up();
  await expect(page.getByLabel('Width', { exact: true })).not.toHaveValue('120');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Width', { exact: true })).toHaveValue('120');
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  const again = await handle.boundingBox();
  await page.mouse.move(again.x, again.y); await page.mouse.down(); await page.mouse.move(again.x + 40, again.y + 30, { steps: 8 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(page.getByLabel('Width', { exact: true })).toHaveValue('120');
});
