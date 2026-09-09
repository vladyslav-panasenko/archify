import {test,expect} from '@playwright/test';
test('directed arrangement exposes direction and spacing before preview',async({page})=>{
 await page.goto('/');await page.locator('.react-flow__node-component').first().click();await page.locator('.react-flow__node-component').nth(1).click({modifiers:['Shift']});await page.getByRole('button',{name:'Auto-arrange',exact:true}).click();await page.getByLabel('Layout method').selectOption('directed');await page.getByLabel('Layout direction').selectOption('down');await page.getByLabel('Layout spacing').fill('100');await page.getByRole('button',{name:'Preview arrangement'}).click();await expect(page.getByLabel('Arrangement preview')).toBeVisible();await page.screenshot({path:'test-results/directed-preview.png'});await page.getByRole('button',{name:'Apply arrangement'}).click();await page.getByRole('button',{name:'Undo',exact:true}).click();
});

test('full canvas arrangement preview is cancellable and guards authoring',async({page})=>{
 await page.goto('/');const nodes=page.locator('.react-flow__node-component');await nodes.first().click();await nodes.nth(1).click({modifiers:['Shift']});
 const position=await nodes.first().getAttribute('style');await page.getByRole('button',{name:'Auto-arrange',exact:true}).click();await page.getByRole('button',{name:'Preview arrangement'}).click();
 await expect(page.getByLabel('Arrangement preview')).toBeVisible();await expect(nodes.first()).not.toHaveAttribute('style',position);await expect(page.getByRole('button',{name:'Add component',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Download JSON',exact:true})).toBeDisabled();
 await page.screenshot({path:'test-results/full-canvas-preview.png'});await page.keyboard.press('Escape');await expect(nodes.first()).toHaveAttribute('style',position);await expect(page.getByLabel('Arrangement preview')).toHaveCount(0);
});
