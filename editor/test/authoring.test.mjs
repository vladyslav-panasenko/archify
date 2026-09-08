import test from 'node:test';
import assert from 'node:assert/strict';
import { arrange } from '../src/arrangement.mjs';
import { snapBox, snapPositions, snapResize } from '../src/arrangement.mjs';
import { validate } from '../server.mjs';
import { copySelection, pasteSelection } from '../src/clipboard.mjs';
import { reconnectConnection } from '../src/document.mjs';
import { commonValue, bulkPatch, removeSelection, resetFields } from '../src/selection.mjs';
test('reset removes only optional overrides and preserves required coordinates',()=>{
 const doc=sample();doc.connections[0].labelAt=[40,50];doc.connections[0].labelDx=8;
 assert.deepEqual(resetFields(doc,['a'],'position').document.components[0].pos,[20,20]);
 assert.equal(resetFields(doc,['a'],'size').document.components[0].size,undefined);
 const label=resetFields(doc,[],'label',0).document;assert.deepEqual(label.connections[0].via,[[150,30]]);assert.equal(label.connections[0].labelAt,undefined);
 assert.equal(resetFields(doc,[],'route',0).document.connections[0].labelDx,8);
});
test('bulk editing preserves individual geometry and deletion cleans references atomically',()=>{
 const doc=sample();doc.boundaries=[{kind:'region',label:'Group',wraps:['a','b']}];doc.meta.views=[{id:'v',label:'View',focus:['a','c']}];
 assert.equal(commonValue(doc,['a','b'],'width'),undefined); const next=bulkPatch(doc,['a','b'],'width',150);
 assert.deepEqual(next.components.map(c=>c.size[1]),[40,80,60]);assert.equal(next.components[1].size[0],150);
 const removed=removeSelection(doc,['a','b']);assert.equal(removed.connections.length,0);assert.equal(removed.boundaries.length,0);assert.deepEqual(removed.meta.views[0].focus,['c']);
 assert.throws(()=>removeSelection(doc,['a','b','c']));assert.equal(doc.components.length,3);
});
test('reconnecting preserves authored routing and identity',()=>{
 const doc=sample();doc.connections[0].id='edge';doc.connections[0].labelAt=[100,200];
 const next=reconnectConnection(doc,0,{from:'a',to:'c',toSide:'left'});
 assert.deepEqual(next.connections[0],{...doc.connections[0],to:'c',toSide:'left'});validate({...next,components:next.components.map(({custom,...c})=>c)});
 assert.throws(()=>reconnectConnection(doc,0,{from:'a',to:'missing'}));
});

test('clipboard remaps internal edges and positions without losing unknown fields',()=>{
 const doc=sample(), payload=copySelection(doc,['a','b']); const result=pasteSelection(doc,payload);
 assert.equal(result.document.components.length,5); assert.deepEqual(result.document.components[3].custom,{keep:true});
 assert.deepEqual(result.document.connections[1].via,[[174,54]]);
 assert.equal(result.document.connections[1].from,result.ids[0]);assert.equal(result.document.connections[1].to,result.ids[1]);
 assert.equal(new Set(pasteSelection(result.document,payload).document.components.map(c=>c.id)).size,7);
 assert.throws(()=>pasteSelection({...doc,diagram_type:'sequence'},payload));
 assert.equal(doc.components.length,3);
});

const sample = () => ({ schema_version:1, diagram_type:'architecture', meta:{title:'Arrange'}, components:[
  {id:'a',type:'backend',label:'A',pos:[20,20],size:[100,40],custom:{keep:true}},
  {id:'b',type:'backend',label:'B',pos:[180,100],size:[60,80]},
  {id:'c',type:'backend',label:'C',pos:[400,200],size:[100,60]},
], connections:[{from:'a',to:'b',label:'AB',via:[[150,30]]}] });

test('snapping aligns a whole selection, equal spaces, resizes and bypasses',()=>{
  const doc=sample(), positions=new Map([['a',[23,24]],['b',[183,104]]]);
  const snapped=snapPositions(doc,positions,{grid:10,smart:false});
  assert.deepEqual(snapped.positions.get('a'),[20,20]); assert.deepEqual(snapped.positions.get('b'),[180,100]);
  assert.deepEqual(snapPositions(doc,positions,{grid:10,bypass:true}).positions,positions);
  const result=snapBox({pos:[146,0],size:[100,40]},[{pos:[0,0],size:[100,40]},{pos:[300,0],size:[100,40]}]);
  assert.equal(result.delta[0],4); assert.ok(result.guides.some(g=>g.kind==='equal spacing'));
  assert.equal(snapResize(doc,'a',{x:20,y:20,width:103,height:40},{grid:10,smart:false}).rect.width,100);
});

test('alignment and equal-gap distribution preserve unrelated JSON', () => {
  const doc = sample(), ids = ['a','b','c'];
  const aligned = arrange(doc,ids,'right');
  assert.deepEqual(aligned.components.map(c=>c.pos[0]+c.size[0]),[500,500,500]);
  const distributed = arrange(doc,ids,'distributeX');
  assert.equal(distributed.components[1].pos[0]-120,400-distributed.components[1].pos[0]-60);
  assert.deepEqual(distributed.connections,doc.connections);
  assert.deepEqual(distributed.components[0].custom,{keep:true});
  assert.deepEqual(doc.components[1].pos,[180,100]);
  const valid = structuredClone(distributed); delete valid.components[0].custom; validate(valid);
  assert.throws(()=>arrange(doc,['a','b'],'distributeX'));
  assert.throws(()=>arrange({...doc,diagram_type:'sequence'},ids,'left'));
});
