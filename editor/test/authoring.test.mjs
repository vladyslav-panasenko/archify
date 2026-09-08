import test from 'node:test';
import assert from 'node:assert/strict';
import { arrange } from '../src/arrangement.mjs';
import { snapBox, snapPositions, snapResize } from '../src/arrangement.mjs';
import { validate } from '../server.mjs';
import {createDiagram,addNode,saveEdge,saveLane,deleteLane,deleteNode} from '../src/topology.mjs';
import {saveStage,deleteStage} from '../src/topology.mjs';
import {saveMessage,removeMessage,saveRange} from '../src/sequence-structure.mjs';
import {patchSettings,settingFields} from '../src/settings.mjs';
import {searchDiagram} from '../src/search.mjs';
import {documentChanges,mergeDocuments} from '../src/review.mjs';
import {addCheckpoint,readCheckpoints} from '../src/checkpoints.mjs';
test('checkpoint limits never evict existing snapshots or alias the live document',()=>{const doc=sample();let entries=addCheckpoint([],'First',doc);doc.meta.title='Changed';assert.equal(entries[0].document.meta.title,'Arrange');for(let i=1;i<10;i++)entries=addCheckpoint(entries,`Copy ${i}`,doc);assert.throws(()=>addCheckpoint(entries,'Eleventh',doc));assert.equal(entries.length,10);assert.throws(()=>addCheckpoint([],'Large',{data:'x'.repeat(1024*1024)}));assert.throws(()=>readCheckpoints({getItem:()=>'{broken'},'key'));});
test('three-way merge preserves independent changes and requires explicit delete/edit resolution',()=>{
 const base=sample(),local=structuredClone(base),remote=structuredClone(base);local.components[0].pos=[99,20];remote.components[1].label='Remote';let result=mergeDocuments(base,local,remote);assert.equal(result.conflicts.length,0);assert.equal(result.document.components[1].label,'Remote');assert.equal(result.document.components[0].pos[0],99);
 remote.components.shift();result=mergeDocuments(base,local,remote);assert.ok(result.conflicts.some(c=>c.path.at(-1)==='a'));const choices=Object.fromEntries(result.conflicts.map(c=>[c.key,'remote']));assert.ok(!mergeDocuments(base,local,remote,choices).document.components.some(c=>c.id==='a'));
 const conflict=mergeDocuments({a:[1]},{a:[2]},{a:[3]});assert.equal(conflict.conflicts.length,1);assert.deepEqual(mergeDocuments({a:[1]},{a:[2]},{a:[3]},{'["a"]':'remote'}).document,{a:[3]});
});
test('review matches stable IDs across ordering and identifies layout versus topology',()=>{const doc=sample(),next=structuredClone(doc);next.components.reverse();next.components[0].pos=[500,300];next.connections[0].to='c';const changes=documentChanges(doc,next);assert.equal(changes.filter(c=>c.category==='layout').length,1);assert.ok(changes.some(c=>c.path.join('/')==='components/order'));assert.ok(changes.some(c=>c.path.at(-1)==='to'&&c.category==='topology'));assert.deepEqual(documentChanges(doc,structuredClone(doc)),[]);});
test('search finds connection IDs and labels without modifying source',()=>{const doc=sample(),before=JSON.stringify(doc);assert.equal(searchDiagram(doc,'AB')[0].kind,'connection');assert.equal(searchDiagram(doc,'a').filter(r=>r.kind==='node').length,1);assert.equal(JSON.stringify(doc),before);});
test('settings preserve metadata and expose only type-specific supported fields',()=>{
 const doc=sample();doc.meta.custom={preserved:true};const next=patchSettings(doc,{title:'New title',visual_preset:'blueprint',canvasWidth:'1000',canvasHeight:'800'});assert.deepEqual(next.meta.custom,doc.meta.custom);assert.deepEqual(next.connections,doc.connections);assert.deepEqual(next.meta.viewBox,[1000,800]);assert.ok(!settingFields('workflow').some(f=>f.key==='column_fit'));assert.throws(()=>patchSettings(doc,{canvasWidth:'10',canvasHeight:'20'}));
});
test('sequence structural edits require explicit range policy and preserve interval coordinates',()=>{
 let doc=createDiagram('sequence','Sequence');doc=saveRange(doc,'activations',null,{participant:'node-2',from:180,to:300});
 assert.throws(()=>saveMessage(doc,null,{from:'node-2',to:'node-1',label:'Response',y:260}));
 doc=saveMessage(doc,null,{from:'node-2',to:'node-1',label:'Response',y:260},true);validate(doc);const moved=saveMessage(doc,1,{from:'node-2',to:'node-1',label:'Response',y:170},true);assert.equal(moved.messages[0].label,'Response');assert.deepEqual(moved.activations,doc.activations);
 assert.equal(removeMessage(doc,0).messages.length,1);assert.throws(()=>removeMessage(createDiagram('sequence','X'),0));assert.throws(()=>deleteLane(createDiagram('lifecycle','X'),0,'terminal'));
});
test('lifecycle authoring creates state types and reassigns terminal membership',()=>{
 let doc=createDiagram('lifecycle','Lifecycle');doc=addNode(doc,{label:'Done',type:'success',lane:'terminal',col:0});doc=saveEdge(doc,null,{from:'node-2',to:'node-3',label:'Complete'});validate(doc);
 const reassigned=deleteLane(doc,2,'main');assert.equal(reassigned.states[2].lane,'main');assert.deepEqual(reassigned.transitions,doc.transitions);validate(reassigned);assert.throws(()=>deleteNode(createDiagram('lifecycle','X'),'node-1'));
});
test('dataflow stage deletion remaps indices and retains flow endpoints',()=>{
 let doc=createDiagram('dataflow','Data');doc=saveStage(doc,null,'Third');doc=addNode(doc,{label:'Extra',type:'backend',stage:2,row:1});doc=saveEdge(doc,null,{from:'node-1',to:'node-3',label:'Data'});
 const next=deleteStage(doc,1,0);assert.equal(next.nodes[1].stage,0);assert.equal(next.nodes[2].stage,1);assert.deepEqual(next.flows,doc.flows);validate(next);assert.throws(()=>deleteStage(next,0,1));assert.throws(()=>deleteNode(createDiagram('dataflow','Data'),'node-1'));
});
test('workflow topology preserves version and reassigns dependent lane groups',()=>{
 let doc=createDiagram('workflow','Workflow');doc.schema_version=2;doc=saveLane(doc,null,{label:'Second'});doc=addNode(doc,{label:'Next',type:'backend',lane:'lane-2',col:1});doc=saveEdge(doc,null,{from:'node-1',to:'node-2',label:'Next'});
 doc.groups=[{id:'g',label:'Group',lane:'lane-2',fromCol:0,toCol:1}];doc=deleteLane(doc,1,'lane-1');assert.equal(doc.nodes[1].lane,'lane-1');assert.equal(doc.groups[0].lane,'lane-1');assert.equal(doc.schema_version,2);validate(doc);assert.equal(deleteNode(doc,'node-2').edges.length,0);
});
import { saveBoundary, moveBoundary, deleteBoundary } from '../src/structure.mjs';
test('boundary creation, membership and group movement preserve components and edges',()=>{
 const doc=sample(),grouped=saveBoundary(doc,null,{label:'Region',kind:'region',pad:30,wraps:['a','b']});
 const moved=moveBoundary(grouped,0,50,20);assert.deepEqual(moved.components[0].pos,[70,40]);assert.deepEqual(moved.components[2],doc.components[2]);assert.deepEqual(moved.connections,doc.connections);
 assert.equal(deleteBoundary(moved,0).components.length,3);assert.throws(()=>saveBoundary(doc,null,{label:'X',kind:'region',pad:0,wraps:[]}));
});
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
