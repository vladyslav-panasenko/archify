import test from 'node:test';
import assert from 'node:assert/strict';
import { arrange } from '../src/arrangement.mjs';
import { validate } from '../server.mjs';

const sample = () => ({ schema_version:1, diagram_type:'architecture', meta:{title:'Arrange'}, components:[
  {id:'a',type:'backend',label:'A',pos:[20,20],size:[100,40],custom:{keep:true}},
  {id:'b',type:'backend',label:'B',pos:[180,100],size:[60,80]},
  {id:'c',type:'backend',label:'C',pos:[400,200],size:[100,60]},
], connections:[{from:'a',to:'b',label:'AB',via:[[150,30]]}] });

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
