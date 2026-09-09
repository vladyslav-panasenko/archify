import {test,expect} from '@playwright/test';

test('keyboard outline supports multiselection, announces edits and exposes skip links',async({page})=>{
 await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to diagram canvas'})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('main',{name:'Diagram canvas'})).toBeFocused();
 const first=page.getByRole('button',{name:'Users users',exact:true}),second=page.getByRole('button',{name:'Auth Provider auth',exact:true});await first.focus();await page.keyboard.press('Enter');await expect(first).toHaveAttribute('aria-pressed','true');await second.focus();await page.keyboard.press('Shift+Enter');await expect(second).toHaveAttribute('aria-pressed','true');await expect(page.getByLabel('Canvas selection')).toHaveText('2 components selected.');
 await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'JSON',exact:true}).click();const document=JSON.parse(await page.getByLabel('Diagram JSON').inputValue());expect(document.components[0].pos).toEqual([41,300]);expect(document.components[1].pos).toEqual([41,110]);await page.getByRole('button',{name:'Undo',exact:true}).click();await page.screenshot({path:'test-results/accessibility-desktop.png'});
 await page.locator('.react-flow__edge').first().focus();await page.keyboard.press('Enter');await expect(page.getByLabel('Canvas selection')).toContainText('Connection users to cdn selected.');
});

test('JSON apply prevents edits while validation is pending',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'JSON',exact:true}).click();const text=page.getByLabel('Diagram JSON');await text.fill((await text.inputValue()).replace('Sample Web App','Updated title'));
 let release;const pending=new Promise(resolve=>release=resolve);await page.route('**/api/validate',async route=>{await pending;await route.continue();});
 await page.getByRole('button',{name:'Apply JSON',exact:true}).click();await expect(text).toBeDisabled();release();await expect(text).toBeEnabled();await expect(page.getByRole('status')).toContainText('JSON applied');expect(JSON.parse(await text.inputValue()).meta.title).toBe('Updated title');
});

test('narrow outline remains available, Escape restores focus and controls have names',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');const toggle=page.getByRole('button',{name:'Components and files'});await toggle.focus();await page.keyboard.press('Enter');await expect(page.getByRole('complementary',{name:'Components',exact:true})).toBeVisible();await page.getByRole('button',{name:'Users users',exact:true}).focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');await expect(toggle).toBeFocused();await expect(toggle).toHaveAttribute('aria-expanded','false');
 await page.getByRole('button',{name:'Templates',exact:true}).click();await page.screenshot({path:'test-results/accessibility-narrow.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const unnamed=await page.locator('button:visible,input:visible,select:visible,textarea:visible').evaluateAll(elements=>elements.filter(el=>!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')&&!el.textContent.trim()&&!el.getAttribute('title')&&!el.labels?.length).map(el=>el.outerHTML.slice(0,150)));expect(unnamed).toEqual([]);
 const color=await page.locator('.tabs button').first().evaluate(el=>getComputedStyle(el).color);expect(color).toBe('rgb(82, 101, 112)');
 const clipped=await page.locator('.inspector button:visible').evaluateAll(buttons=>buttons.filter(b=>b.scrollWidth>b.clientWidth+1).map(b=>b.textContent));expect(clipped).toEqual([]);
});
