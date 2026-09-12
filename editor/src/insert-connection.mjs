import {addComponent,components} from './document.mjs';
import {freshId} from './topology.mjs';
export function insertConnection(document,index,label) {
 if(document.diagram_type!=='architecture'||!document.connections[index])throw new Error('Select an architecture connection.');
 const edge=document.connections[index],next=addComponent(document,{label,type:'backend'}),node=next.components.at(-1),boxes=components(document),from=boxes.find(n=>n.id===edge.from),to=boxes.find(n=>n.id===edge.to);
 node.pos=[0,1].map(axis=>Math.max(0,Math.round((from.pos[axis]+from.size[axis]/2+to.pos[axis]+to.size[axis]/2)/2-(axis?30:60))));
 const incoming={...edge,to:node.id};
 for(const key of ['via','route','labelAt','labelDx','labelDy','fromSide','toSide'])delete incoming[key];
 const outgoing={id:freshId(next.connections,'connection'),from:node.id,to:edge.to};
 next.connections.splice(index,1,incoming,outgoing);
 return next;
}
