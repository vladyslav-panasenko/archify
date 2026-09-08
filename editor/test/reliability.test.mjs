import test from 'node:test';
import assert from 'node:assert/strict';
import {autoLayout} from '../src/auto-layout.mjs';
import {history,commit,undo} from '../src/document.mjs';
import {validate} from '../server.mjs';

test('auto-arrange is deterministic, avoids locked obstacles and preserves authored routes',()=>{
 const doc={schema_version:1,diagram_type:'architecture',meta:{title:'Grid'},components:['a','b','c'].map((id,i)=>({id,type:'backend',label:id,pos:[20+i*5,60],size:[120,60]})),connections:[{from:'a',to:'b',via:[[50,300]]},{from:'b',to:'a'}]};
 const next=autoLayout(doc,['b','a','c'],['c']);
 assert.deepEqual(next,autoLayout(doc,['c','a','b'],['c']));assert.deepEqual(next.components[2],doc.components[2]);assert.deepEqual(next.connections,doc.connections);assert.notDeepEqual(next.components[0].pos,doc.components[0].pos);validate(next);
 assert.deepEqual(undo(commit(history(doc),next)).present,doc);assert.throws(()=>autoLayout(doc,['c'],['c']));
});
