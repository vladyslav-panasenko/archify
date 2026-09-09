import test from 'node:test';
import assert from 'node:assert/strict';
import {autoLayout} from '../src/auto-layout.mjs';
import {history,commit,undo} from '../src/document.mjs';
import {validate} from '../server.mjs';
import {saveTemplate,renameTemplate,importTemplate,exportTemplate,checkTemplates} from '../src/templates.mjs';
import {pasteSelection} from '../src/clipboard.mjs';
import {newDocument} from '../src/document.mjs';
import {inspectJson,sourceIndex,suggestions,insertSuggestion,pathAt} from '../src/json-source.mjs';

test('JSON indexing handles escaped strings, schema refs and located diagnostics',()=>{
 const text=JSON.stringify({...newDocument(),meta:{title:'Escaped " { } / ~ \\ text'}},null,2),index=inspectJson(text);
 assert.equal(index.issues.length,0);assert.equal(pathAt(index.ranges,text.indexOf('backend')),'/components/0/type');
 const opts=suggestions(index,'/components/0/type');assert.ok(opts.some(o=>o.value==='database'));
 const next=insertSuggestion(text,index,'/components/0/type',opts.find(o=>o.value==='database'));assert.equal(JSON.parse(next).components[0].type,'database');
 const meta=suggestions(index,'/meta');const inserted=insertSuggestion(text,index,'/meta',meta.find(o=>o.key==='subtitle'));assert.equal(JSON.parse(inserted).meta.subtitle,'');
 const invalid=inspectJson(text.replace('backend','invalid'));assert.ok(invalid.issues.some(i=>i.path==='/components/0/type'&&i.line>1));assert.ok(inspectJson('{').issues.length);assert.throws(()=>sourceIndex('{'));
});

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
