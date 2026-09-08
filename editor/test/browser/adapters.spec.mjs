import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

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
