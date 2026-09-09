import test from 'node:test';
import assert from 'node:assert/strict';
import {autoLayout} from '../src/auto-layout.mjs';
import {history,commit,undo} from '../src/document.mjs';
import {validate} from '../server.mjs';
import {saveTemplate,renameTemplate,importTemplate,exportTemplate,checkTemplates} from '../src/templates.mjs';
import {pasteSelection} from '../src/clipboard.mjs';
import {newDocument} from '../src/document.mjs';

test('templates round trip, remap IDs and enforce bounds without evicting entries',()=>{
 const doc=newDocument();doc.components.push({...doc.components[0],id:'second',pos:[300,120]});doc.connections=[{id:'e',from:'component-1',to:'second'}];
 const entries=saveTemplate([],'Pair',doc,['component-1','second']);const renamed=renameTemplate(entries,entries[0].id,'Service pair');assert.equal(entries[0].name,'Pair');
 const imported=importTemplate([],exportTemplate(renamed[0]));const result=pasteSelection(doc,imported[0].fragment);validate(result.document);assert.equal(result.document.connections.at(-1).from,result.ids[0]);assert.equal(result.document.connections.at(-1).to,result.ids[1]);
 assert.throws(()=>checkTemplates(Array(21).fill(entries[0])));assert.throws(()=>renameTemplate(entries,entries[0].id,''));assert.throws(()=>importTemplate(entries,{}));assert.equal(entries.length,1);
});

test('auto-arrange is deterministic, avoids locked obstacles and preserves authored routes',()=>{
 const doc={schema_version:1,diagram_type:'architecture',meta:{title:'Grid'},components:['a','b','c'].map((id,i)=>({id,type:'backend',label:id,pos:[20+i*5,60],size:[120,60]})),connections:[{from:'a',to:'b',via:[[50,300]]},{from:'b',to:'a'}]};
 const next=autoLayout(doc,['b','a','c'],['c']);
 assert.deepEqual(next,autoLayout(doc,['c','a','b'],['c']));assert.deepEqual(next.components[2],doc.components[2]);assert.deepEqual(next.connections,doc.connections);assert.notDeepEqual(next.components[0].pos,doc.components[0].pos);validate(next);
 assert.deepEqual(undo(commit(history(doc),next)).present,doc);assert.throws(()=>autoLayout(doc,['c'],['c']));
});
