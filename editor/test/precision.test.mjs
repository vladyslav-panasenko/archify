import test from 'node:test';
import assert from 'node:assert/strict';
import {snapBox,snapPositions} from '../src/arrangement.mjs';
import {newDocument} from '../src/document.mjs';
export const fixture=()=>({...newDocument(),components:[{id:'a',type:'backend',label:'A',pos:[100,100],size:[100,60]},{id:'b',type:'backend',label:'B',pos:[400,100],size:[100,60]},{id:'c',type:'backend',label:'C',pos:[250,300],size:[100,60]}],connections:[{from:'a',to:'b',label:'HTTP',via:[[200,130],[250,130],[400,130]]}]});
test('guides use screen-scaled tolerance, preserve groups and ignore remote spacing neighbors',()=>{
 const box={pos:[251,100],size:[100,60]},near=[{pos:[100,100],size:[100,60]},{pos:[400,100],size:[100,60]}];assert.equal(snapBox(box,near).delta[0],-1);assert.equal(snapBox(box,near.map(c=>({...c,pos:[c.pos[0],900]}))).delta[0],0);assert.equal(snapBox({...box,pos:[255,100]},near,{threshold:3}).delta[0],0);assert.equal(snapBox({...box,pos:[255,100]},near,{threshold:12}).delta[0],-5);assert.deepEqual(snapBox(box,near,{bypass:true}).guides,[]);
 const doc=fixture(),positions=new Map([['a',[104,100]],['c',[254,300]]]),result=snapPositions(doc,positions,{threshold:6});assert.equal(result.positions.get('c')[0]-result.positions.get('a')[0],150);assert.deepEqual(doc.components[0].pos,[100,100]);
});

import {simplifyRoute} from '../src/segments.mjs';
test('route cleanup preserves shape and metadata; straightening only removes authored waypoints',()=>{
 const doc=fixture();doc.connections[0].via=[[0,0],[10,0],[10,0],[20,0],[10,0],[10,10]];doc.connections[0].labelAt=[5,8];const next=simplifyRoute(doc,0);assert.deepEqual(next.connections[0].via,[[0,0],[20,0],[10,0],[10,10]]);assert.deepEqual(next.connections[0].labelAt,[5,8]);assert.deepEqual(next.components,doc.components);const straight=simplifyRoute(doc,0,'straight');assert.equal(straight.connections[0].via,undefined);assert.equal(straight.connections[0].route,'straight');assert.equal(straight.connections[0].label,'HTTP');assert.equal(doc.connections[0].via.length,6);
});

import {boundaryBounds,fitBoundary} from '../src/structure.mjs';
test('boundary fit changes only native padding and computes bounds around members',()=>{
 const doc=fixture();doc.boundaries=[{label:'Cloud',kind:'region',wraps:['a','b'],pad:30}];assert.deepEqual(boundaryBounds(doc,doc.boundaries[0],10),{pos:[90,90],size:[420,100]});const next=fitBoundary(doc,0,10);assert.deepEqual(next.components,doc.components);assert.deepEqual(next.connections,doc.connections);assert.equal(next.boundaries[0].pad,10);assert.equal(doc.boundaries[0].pad,30);assert.throws(()=>fitBoundary(doc,0,-1));assert.throws(()=>boundaryBounds(doc,{wraps:['missing']}));
});
