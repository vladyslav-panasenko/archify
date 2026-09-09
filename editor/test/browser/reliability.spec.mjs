import {test,expect} from '@playwright/test';
test('auto-arrangement previews, cancels and applies one undoable edit',async({page})=>{
 await page.goto('/');await page.locator('.react-flow__node-component').first().click();await page.locator('.react-flow__node-component').nth(1).click({modifiers:['Shift']});
 await page.getByRole('button',{name:'JSON',exact:true}).click();const before=await page.getByLabel('Diagram JSON').inputValue();
 await page.getByRole('button',{name:'Auto-arrange',exact:true}).click();await page.getByRole('button',{name:'Preview arrangement'}).click();await expect(page.getByRole('img',{name:'Proposed component arrangement'})).toBeVisible();await page.getByRole('button',{name:'Cancel arrangement'}).click();
 await page.getByRole('button',{name:'JSON',exact:true}).click();expect(await page.getByLabel('Diagram JSON').inputValue()).toBe(before);
 await page.getByRole('button',{name:'Auto-arrange',exact:true}).click();await page.getByRole('button',{name:'Preview arrangement'}).click();await page.screenshot({path:'test-results/auto-arrange.png'});await page.getByRole('button',{name:'Apply arrangement'}).click();
 await page.getByRole('button',{name:'JSON',exact:true}).click();await expect(page.getByLabel('Diagram JSON')).not.toHaveValue(before);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByLabel('Diagram JSON')).toHaveValue(before);
});

