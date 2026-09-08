import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEditorServer} from '../../server.mjs';
test('source conflicts combine changes, require choices and recheck revision on save',async({page})=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'archify-merge-')),file=path.join(dir,'source.json');const original=JSON.parse(await fs.readFile(new URL('../../../archify/examples/web-app.architecture.json',import.meta.url),'utf8'));await fs.writeFile(file,JSON.stringify(original));const server=await createEditorServer({file});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Users users'}).click();await page.getByLabel('X',{exact:true}).fill('55');await page.getByLabel('X',{exact:true}).press('Tab');const remote=structuredClone(original);remote.components[0].pos=[60,300];remote.meta.title='External title';await fs.writeFile(file,JSON.stringify(remote));await page.getByRole('button',{name:'Save file',exact:true}).click();await expect(page.getByRole('heading',{name:'Source conflict',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Apply merged draft',exact:true})).toBeDisabled();await page.getByRole('combobox',{name:'Resolve components / users / pos',exact:true}).selectOption('local');await page.getByRole('button',{name:'Apply merged draft',exact:true}).click();expect(JSON.parse(await fs.readFile(file,'utf8')).components[0].pos[0]).toBe(60);
 remote.meta.subtitle='Changed again';await fs.writeFile(file,JSON.stringify(remote));
 await page.getByRole('button',{name:'Save reviewed file',exact:true}).click();await expect(page.getByRole('heading',{name:'Source conflict',exact:true})).toBeVisible();
 expect(JSON.parse(await fs.readFile(file,'utf8')).components[0].pos[0]).toBe(60);
 await page.getByRole('button',{name:'Apply merged draft',exact:true}).click();
 await page.getByRole('button',{name:'Save reviewed file',exact:true}).click();const saved=JSON.parse(await fs.readFile(file,'utf8'));expect(saved.components[0].pos[0]).toBe(55);expect(saved.meta.title).toBe('External title');expect(saved.meta.subtitle).toBe('Changed again');
 }finally{await page.close();await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
