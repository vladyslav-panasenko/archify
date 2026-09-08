import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('sequence participants reorder and message spacing remains schema-compatible', async ({ page }) => {
  const doc = JSON.parse(await fs.readFile(new URL('../../../archify/examples/cache-miss-request.sequence.json', import.meta.url)));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Sample Web App' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'sequence.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
  await page.locator('.component-list button').first().click();
  await expect(page.getByLabel('Width', { exact: true })).toHaveCount(0);
  await page.getByLabel('Participant order').fill('1'); await page.getByLabel('Participant order').press('Tab');
  await page.getByRole('button', { name: 'JSON', exact: true }).click(); const edited = JSON.parse(await page.getByLabel('Diagram JSON').inputValue());
  expect(edited.participants[1].id).toBe('user'); expect(edited.messages).toEqual(doc.messages);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.getByRole('button', { name: 'Properties', exact: true }).click();
  const label = page.getByRole('button', { name:'Move label: open page', exact:true }); const box = await label.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down(); await page.mouse.move(box.x+box.width/2,box.y+box.height/2+4,{steps:4}); await page.mouse.up();
  await page.getByRole('button', { name: 'JSON', exact: true }).click(); const moved = JSON.parse(await page.getByLabel('Diagram JSON').inputValue());
  expect(moved.messages[0].y).toBeGreaterThan(185); expect(moved.messages[0].y).toBeLessThan(220); expect(moved.messages[0].labelAt).toBeUndefined();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Render HTML', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible();
});

test('lifecycle JSON edits offsets and renders its original schema', async ({ page }) => {
  const doc = JSON.parse(await fs.readFile(new URL('../../../archify/examples/agent-run.lifecycle.json', import.meta.url)));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Sample Web App' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'lifecycle.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
  await page.locator('.component-list button').first().click(); await page.getByLabel('Vertical offset', { exact: true }).fill('4'); await page.getByLabel('Vertical offset', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'JSON', exact: true }).click(); const edited = JSON.parse(await page.getByLabel('Diagram JSON').inputValue());
  expect(edited.states[0].yOffset).toBe(4); expect(edited.transitions).toEqual(doc.transitions);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.getByRole('button', { name: 'Render HTML', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible();
});

test('dataflow JSON edits stage and row fields without losing flows', async ({ page }) => {
  const doc = JSON.parse(await fs.readFile(new URL('../../../archify/examples/event-stream.dataflow.json', import.meta.url)));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Sample Web App' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'dataflow.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
  await page.locator('.component-list button').first().click(); await page.getByLabel('Row', { exact: true }).fill('1'); await page.getByLabel('Row', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'JSON', exact: true }).click(); const edited = JSON.parse(await page.getByLabel('Diagram JSON').inputValue());
  expect(edited.nodes[0].row).toBe(1); expect(edited.flows).toEqual(doc.flows);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.getByRole('button', { name: 'Render HTML', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible();
});

test('workflow JSON opens, edits logical columns and renders after undo', async ({ page }) => {
  const doc = JSON.parse(await fs.readFile(new URL('../../../archify/examples/agent-tool-call.workflow.json', import.meta.url)));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Sample Web App' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'workflow.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
  await expect(page.getByRole('heading', { name: doc.meta.title })).toBeVisible();
  await page.locator('.component-list button').first().click();
  await page.getByLabel('Column', { exact: true }).fill('1'); await page.getByLabel('Column', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'JSON', exact: true }).click();
  const edited = JSON.parse(await page.getByLabel('Diagram JSON').inputValue());
  expect(edited.nodes[0].col).toBe(1); expect(edited.nodes[0].pos).toBeUndefined();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Render HTML', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible();
});
