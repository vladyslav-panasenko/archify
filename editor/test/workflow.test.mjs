import test from 'node:test';
import assert from 'node:assert/strict';
import {newDocument} from '../src/document.mjs';
import {insertConnection} from '../src/insert-connection.mjs';
import {validate} from '../server.mjs';
const fixture=()=>({...newDocument(),components:[{id:'a',type:'backend',label:'A',pos:[80,120],size:[100,60]},{id:'b',type:'backend',label:'B',pos:[400,120],size:[100,60]}],connections:[{id:'original',from:'a',to:'b',label:'HTTP',via:[[200,150],[400,150]]}]});
test('inserting a component retains incoming metadata and creates fresh outgoing topology',()=>{const doc=fixture(),next=insertConnection(doc,0,'Gateway');validate(next);const id=next.components.at(-1).id;assert.equal(next.connections[0].id,'original');assert.equal(next.connections[0].label,'HTTP');assert.equal(next.connections[0].to,id);assert.equal(next.connections[0].via,undefined);assert.equal(next.connections[1].from,id);assert.equal(next.connections[1].to,'b');assert.notEqual(next.connections[1].id,'original');assert.deepEqual(next.components.slice(0,2),doc.components);assert.equal(doc.connections.length,1);});
