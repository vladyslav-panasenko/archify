import test from 'node:test';
import assert from 'node:assert/strict';
import {autoLayout} from '../src/auto-layout.mjs';
import {newDocument} from '../src/document.mjs';
import {moveSegment,routeSegments} from '../src/segments.mjs';
import {layoutProblems} from '../src/document.mjs';
import {compilerProblems} from '../src/problems.mjs';
test('problems keep stable node references and map compiler paths without guessing unknown subjects',()=>{
 const doc=diagram();const issues=layoutProblems(doc);assert.ok(issues.some(p=>p.ids.includes('a')&&p.ids.includes('b')));const outside=structuredClone(doc);outside.components[0].pos=[-10,80];assert.ok(layoutProblems(outside).some(p=>p.kind==='bounds'&&p.ids[0]==='a'));
 const mapped=compilerProblems(doc,[{message:'bad edge',subject:{path:'/connections/0'}},{message:'unknown',subject:{path:'/meta'}}]);assert.deepEqual(mapped[0].ids,['a','b']);assert.equal(mapped[0].edgeIndex,0);assert.deepEqual(mapped[1].ids,[]);
});
test('segment motion edits exactly two coordinates perpendicular to an authored route',()=>{
 const doc=diagram();doc.connections[0].via=[[10,10],[100,10],[100,90]];doc.connections[0].labelAt=[40,5];const next=moveSegment(doc,0,0,[999,35]);assert.deepEqual(next.connections[0].via,[[10,35],[100,35],[100,90]]);assert.deepEqual(next.connections[0].labelAt,[40,5]);assert.deepEqual(doc.connections[0].via,[[10,10],[100,10],[100,90]]);assert.equal(routeSegments(doc.connections[0]).length,2);assert.throws(()=>moveSegment(doc,0,0,[NaN,0]));assert.equal(routeSegments({via:[[0,0],[1,1]]}).length,0);
});
const diagram=()=>({...newDocument(),components:['a','b','c'].map(id=>({id,type:'backend',label:id,pos:[20,80],size:[100,50]})),connections:[{from:'a',to:'b'},{from:'b',to:'c'}]});
test('directed layout follows edges, changes direction and preserves cycles and locks',()=>{
 const doc=diagram(),ids=['c','a','b'];const right=autoLayout(doc,ids,[],{mode:'directed',direction:'right',gap:80});assert.ok(right.components[0].pos[0]<right.components[1].pos[0]);assert.ok(right.components[1].pos[0]<right.components[2].pos[0]);assert.deepEqual(right.connections,doc.connections);
 const down=autoLayout(doc,ids,[],{mode:'directed',direction:'down',gap:80});assert.ok(down.components[2].pos[1]>down.components[1].pos[1]);
 doc.connections.push({from:'c',to:'a'});assert.deepEqual(autoLayout(doc,ids,[],{mode:'directed'}),autoLayout(doc,[...ids].reverse(),[],{mode:'directed'}));assert.deepEqual(autoLayout(doc,ids,['b'],{mode:'directed'}).components[1],doc.components[1]);assert.throws(()=>autoLayout(doc,ids,[],{gap:-1}));
});

