import {clone,assertDocument,components} from './document.mjs';
import {sourceNodes,connections,nodeKey} from './adapters/index.mjs';
const fields={architecture:['pos','size'],workflow:['col','yOffset','width','height'],dataflow:['stage','row','yOffset','width','height'],lifecycle:['col','yOffset','width','height'],sequence:[]};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function compareLayout(current,candidate,locked=[]) {
  assertDocument(candidate);
  if(current.diagram_type!==candidate.diagram_type||current.schema_version!==candidate.schema_version)throw new Error('Compare documents of the same type and schema version.');
  const ids=d=>sourceNodes(d).map(n=>n.id).sort(),edges=d=>connections(d).map(e=>JSON.stringify([e.id??null,e.from,e.to])).sort();
  if(!equal(ids(current),ids(candidate))||!equal(edges(current),edges(candidate)))throw new Error('Layout comparison requires the same node IDs and connection endpoints. Use source merge for topology changes.');
  for(const key of ['lanes','stages'])if(!equal(current[key],candidate[key]))throw new Error(`Keep ${key} unchanged when comparing placement.`);
  const target=new Map(sourceNodes(candidate).map(n=>[n.id,n]));
  const result=[];
  for(const node of sourceNodes(current)) {
    const other=target.get(node.id);
    if(node.lane!==other.lane)throw new Error('Keep lane membership unchanged when comparing placement.');
    const changes=fields[current.diagram_type].filter(key=>!equal(node[key],other[key]));
    if(changes.length&&!locked.includes(node.id))result.push({key:`node:${node.id}`,ids:[node.id],label:node.label,fields:changes});
  }
  if(current.diagram_type==='sequence'&&!equal(current.participants.map(n=>n.id),candidate.participants.map(n=>n.id))&&!locked.length)result.push({key:'participant-order',ids:current.participants.map(n=>n.id),label:'Participant order',fields:['order']});
  return result;
}
export function acceptLayout(current,candidate,keys,locked=[]) {
  const changes=compareLayout(current,candidate,locked).filter(c=>keys.includes(c.key)),next=clone(current),targets=new Map(sourceNodes(candidate).map(n=>[n.id,n]));
  for(const change of changes) {
    if(change.key==='participant-order') {const nodes=new Map(next.participants.map(n=>[n.id,n]));next.participants=candidate.participants.map(n=>nodes.get(n.id));continue;}
    const node=sourceNodes(next).find(n=>n.id===change.ids[0]),other=targets.get(node.id);
    for(const key of change.fields)if(other[key]===undefined)delete node[key];else node[key]=clone(other[key]);
  }
  return assertDocument(next);
}
export function layoutGhosts(current,proposed) {
  const before=new Map(components(current).map(n=>[n.id,n]));
  return components(proposed).filter(n=>!equal(n.pos,before.get(n.id)?.pos)||!equal(n.size,before.get(n.id)?.size));
}
