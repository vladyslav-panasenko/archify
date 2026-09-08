import { test, expect } from '@playwright/test';

test('duplicate and local copy/paste create fresh items and undo once',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Users users'}).click();
 await page.getByText('Copy and duplicate',{exact:true}).click();
 await page.getByRole('button',{name:'Copy selection',exact:true}).click();await page.getByRole('button',{name:'Paste selection',exact:true}).click();
 await expect(page.locator('[data-id="c:users-copy-1"]')).toBeVisible();
 await page.getByRole('button',{name:'Duplicate selection',exact:true}).click();await expect(page.locator('[data-id="c:users-copy-1-copy-1"]')).toBeVisible();
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('[data-id="c:users-copy-1-copy-1"]')).toHaveCount(0);
});

test('configurable grid snapping applies to dragging and Alt bypasses it',async({page})=>{
  await page.goto('/'); await page.getByRole('button',{name:'Users users'}).click();
  await page.getByText('Snapping',{exact:true}).click(); await page.getByLabel('Grid spacing').fill('25');
  await page.getByLabel('Snap to grid',{exact:true}).check();
  const node=page.locator('[data-id="c:users"]');
  async function drag(alt=false){const r=await node.boundingBox(); if(alt)await page.keyboard.down('Alt');await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+34,r.y+r.height/2+17,{steps:8});await page.mouse.up();if(alt)await page.keyboard.up('Alt');}
  await drag(); expect(Number(await page.getByLabel('X',{exact:true}).inputValue())%25).toBe(0);
  await drag(true); expect(Number(await page.getByLabel('X',{exact:true}).inputValue())%25).not.toBe(0);
});

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
