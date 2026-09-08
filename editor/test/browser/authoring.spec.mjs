import { test, expect } from '@playwright/test';

test('aligning a selection updates JSON in one undo step', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-id="c:api"]').click();
  await page.locator('[data-id="c:cache"]').click({modifiers:['Shift']});
  await page.getByRole('button',{name:'Align top',exact:true}).click();
  await page.getByRole('button',{name:'JSON',exact:true}).click();
  const doc=JSON.parse(await page.getByLabel('Diagram JSON').inputValue());
  expect(doc.components.find(c=>c.id==='api').pos[1]).toBe(doc.components.find(c=>c.id==='cache').pos[1]);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
});
