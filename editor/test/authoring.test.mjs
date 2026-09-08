import test from 'node:test';
import assert from 'node:assert/strict';
import { arrange } from '../src/arrangement.mjs';
import { snapBox, snapPositions, snapResize } from '../src/arrangement.mjs';
import { validate } from '../server.mjs';
import { copySelection, pasteSelection } from '../src/clipboard.mjs';

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
