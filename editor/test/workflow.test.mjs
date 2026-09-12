import test from 'node:test';
import assert from 'node:assert/strict';
import {newDocument} from '../src/document.mjs';
import {insertConnection} from '../src/insert-connection.mjs';
import {validate} from '../server.mjs';
const fixture=()=>({...newDocument(),components:[{id:'a',type:'backend',label:'A',pos:[80,120],size:[100,60]},{id:'b',type:'backend',label:'B',pos:[400,120],size:[100,60]}],connections:[{id:'original',from:'a',to:'b',label:'HTTP',via:[[200,150],[400,150]]}]});
test('inserting a component retains incoming metadata and creates fresh outgoing topology',()=>{const doc=fixture(),next=insertConnection(doc,0,'Gateway');validate(next);const id=next.components.at(-1).id;assert.equal(next.connections[0].id,'original');assert.equal(next.connections[0].label,'HTTP');assert.equal(next.connections[0].to,id);assert.equal(next.connections[0].via,undefined);assert.equal(next.connections[1].from,id);assert.equal(next.connections[1].to,'b');assert.notEqual(next.connections[1].id,'original');assert.deepEqual(next.components.slice(0,2),doc.components);assert.equal(doc.connections.length,1);});

import {resolveOverlaps} from '../src/arrangement.mjs';
import {layoutProblems} from '../src/document.mjs';
test('overlap resolution moves only selected unlocked items and preserves topology',()=>{const doc=fixture();doc.components[1].pos=[100,130];const next=resolveOverlaps(doc,['a','b'],['a']);assert.equal(layoutProblems(next).filter(p=>p.kind==='overlap').length,0);assert.deepEqual(next.components[0],doc.components[0]);assert.deepEqual(next.connections,doc.connections);assert.deepEqual(resolveOverlaps(doc,['a','b'],['a']),next);assert.deepEqual(doc.components[1].pos,[100,130]);assert.throws(()=>resolveOverlaps(doc,['a'],['a']));});

import {savePreset,readPresets,presetKey} from '../src/layout-presets.mjs';
test('layout presets validate and bound local settings without retaining document fields',()=>{const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},settings={mode:'directed',direction:'down',gap:80,gridSize:20,snap:true,smartSnap:true,document:fixture()};savePreset(storage,'Dense',settings);assert.equal(readPresets(storage)[0].settings.document,undefined);for(let i=0;i<19;i++)savePreset(storage,'P'+i,settings);assert.throws(()=>savePreset(storage,'Overflow',settings));assert.equal(readPresets(storage).length,20);assert.throws(()=>savePreset(storage,'Bad',{...settings,gap:NaN}));storage.setItem(presetKey,'invalid');assert.deepEqual(readPresets(storage),[]);});

import {packHistory,restoreHistory} from '../src/recovery-history.mjs';
import {history,commit,undo,redo} from '../src/document.mjs';
test('recovery history is bounded and validates snapshots with legacy and corrupt fallback',async()=>{
 const doc=fixture();let state=history(doc);for(let i=0;i<30;i++)state=commit(state,{...doc,meta:{...doc.meta,title:'Version '+i}});state=undo(state);const historyData=packHistory(state),recovery={document:state.present,historyData};assert.ok(historyData.past.length+historyData.future.length<=20);const restored=await restoreHistory(recovery,validate);assert.equal(redo(restored).present.meta.title,'Version 29');assert.deepEqual(undo(redo(restored)).present,state.present);assert.equal(commit(restored,doc).future.length,0);assert.deepEqual(await restoreHistory({document:doc},validate),history(doc));assert.deepEqual(await restoreHistory({document:doc,historyData:{past:[{}],future:[]}},validate),history(doc));const large={...doc,meta:{title:'x'.repeat(1100000)}};assert.equal(packHistory({past:[large],present:doc,future:[]}).past.length,0);
});
