import {test,expect} from '@playwright/test';
test('templates persist locally, rename and insert with fresh identities',async({page})=>{
 await page.goto('/');await page.locator('.react-flow__node-component').first().click();await page.getByRole('button',{name:'Templates',exact:true}).click();await page.getByLabel('Template name',{exact:true}).fill('Saved users');await page.getByRole('button',{name:'Save selection as template'}).click();await expect(page.getByRole('button',{name:'Insert Saved users'})).toBeVisible();
 page.once('dialog',d=>d.accept('Audience'));await page.getByRole('button',{name:'Rename Saved users'}).click();await page.reload();await page.getByRole('button',{name:'Templates',exact:true}).click();await page.getByRole('button',{name:'Insert Audience'}).click();await expect(page.locator('[data-id="c:users-copy-1"]')).toBeVisible();await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('[data-id="c:users-copy-1"]')).toHaveCount(0);
});
test('auto-arrangement previews, cancels and applies one undoable edit',async({page})=>{
 await page.goto('/');await page.locator('.react-flow__node-component').first().click();await page.locator('.react-flow__node-component').nth(1).click({modifiers:['Shift']});
 await page.getByRole('button',{name:'JSON',exact:true}).click();const before=await page.getByLabel('Diagram JSON').inputValue();
 await page.getByRole('button',{name:'Auto-arrange',exact:true}).click();await page.getByRole('button',{name:'Preview arrangement'}).click();await expect(page.getByRole('img',{name:'Proposed component arrangement'})).toBeVisible();await page.getByRole('button',{name:'Cancel arrangement'}).click();
 await page.getByRole('button',{name:'JSON',exact:true}).click();expect(await page.getByLabel('Diagram JSON').inputValue()).toBe(before);
 await page.getByRole('button',{name:'Auto-arrange',exact:true}).click();await page.getByRole('button',{name:'Preview arrangement'}).click();await page.screenshot({path:'test-results/auto-arrange.png'});await page.getByRole('button',{name:'Apply arrangement'}).click();
 await page.getByRole('button',{name:'JSON',exact:true}).click();await expect(page.getByLabel('Diagram JSON')).not.toHaveValue(before);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByLabel('Diagram JSON')).toHaveValue(before);
});

