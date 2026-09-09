import test from 'node:test';
import assert from 'node:assert/strict';
import {autoLayout} from '../src/auto-layout.mjs';
import {newDocument} from '../src/document.mjs';
const diagram=()=>({...newDocument(),components:['a','b','c'].map(id=>({id,type:'backend',label:id,pos:[20,80],size:[100,50]})),connections:[{from:'a',to:'b'},{from:'b',to:'c'}]});
test('directed layout follows edges, changes direction and preserves cycles and locks',()=>{
 const doc=diagram(),ids=['c','a','b'];const right=autoLayout(doc,ids,[],{mode:'directed',direction:'right',gap:80});assert.ok(right.components[0].pos[0]<right.components[1].pos[0]);assert.ok(right.components[1].pos[0]<right.components[2].pos[0]);assert.deepEqual(right.connections,doc.connections);
 const down=autoLayout(doc,ids,[],{mode:'directed',direction:'down',gap:80});assert.ok(down.components[2].pos[1]>down.components[1].pos[1]);
 doc.connections.push({from:'c',to:'a'});assert.deepEqual(autoLayout(doc,ids,[],{mode:'directed'}),autoLayout(doc,[...ids].reverse(),[],{mode:'directed'}));assert.deepEqual(autoLayout(doc,ids,['b'],{mode:'directed'}).components[1],doc.components[1]);assert.throws(()=>autoLayout(doc,ids,[],{gap:-1}));
});
