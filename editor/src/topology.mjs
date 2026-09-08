import { clone, newDocument } from './document.mjs';
import { sourceNodes, connections, nodeKey, edgeKey } from './adapters/index.mjs';
export const authoringTypes=['architecture','workflow'];
export const componentKinds=['frontend','backend','database','cloud','security','messagebus','external'];
export function freshId(items,prefix){let n=1;while(items.some(c=>c.id===`${prefix}-${n}`))n++;return `${prefix}-${n}`;}
export function createDiagram(type,title) {
 if(type==='architecture')return newDocument(title);
 if(type==='workflow')return {schema_version:1,diagram_type:type,meta:{title},lanes:[{id:'lane-1',label:'Main'}],nodes:[{id:'node-1',type:'backend',label:'Start',lane:'lane-1',col:0}],edges:[]};
 throw new Error('Unsupported diagram creation.');
}
export function addNode(document,fields) {
 const next=clone(document),nodes=sourceNodes(next);if(!fields.label.trim())throw new Error('A label is required.');
 const node={id:freshId(nodes,'node'),label:fields.label,type:fields.type||'backend'};
 if(document.diagram_type==='workflow')Object.assign(node,{lane:fields.lane,col:Number(fields.col)});
 else throw new Error('Unsupported node creation.');
 nodes.push(node);return next;
}
export function saveEdge(document,index,fields) {
 const next=clone(document),edges=connections(next);if(!sourceNodes(next).some(c=>c.id===fields.from)||!sourceNodes(next).some(c=>c.id===fields.to))throw new Error('Choose existing endpoints.');
 const edge={...(index===null?{id:freshId(edges,'edge')}:edges[index]),...fields};
 if(index===null)edges.push(edge);else edges[index]=edge;return next;
}
export function deleteEdge(document,index){const next=clone(document);connections(next).splice(index,1);return next;}
function cleanNodeReferences(next,ids){
 next[edgeKey(next)]=connections(next).filter(e=>!ids.includes(e.from)&&!ids.includes(e.to));
 if(next.mainPath){next.mainPath=next.mainPath.filter(id=>!ids.includes(id));if(next.mainPath.length<2)delete next.mainPath;}
 if(next.meta.views){next.meta.views=next.meta.views.map(v=>({...v,focus:v.focus.filter(id=>!ids.includes(id))})).filter(v=>v.focus.length);if(!next.meta.views.length)delete next.meta.views;}
 if(next.semanticChecks){for(const key of ['allowedRoots','allowedTerminals'])if(next.semanticChecks[key])next.semanticChecks[key]=next.semanticChecks[key].filter(id=>!ids.includes(id));for(const key of ['requiredEdges','requiredPaths'])if(next.semanticChecks[key])next.semanticChecks[key]=next.semanticChecks[key].filter(e=>!ids.includes(e.from)&&!ids.includes(e.to));}
}
export function deleteNode(document,id) {
 const next=clone(document);if(sourceNodes(next).length<=1)throw new Error('Keep at least one node.');
 next[nodeKey(next)]=sourceNodes(next).filter(c=>c.id!==id);cleanNodeReferences(next,[id]);return next;
}
export function saveLane(document,index,fields){const next=clone(document);if(!fields.label.trim())throw new Error('A lane label is required.');const item={...(index===null?{id:freshId(next.lanes,'lane')}:next.lanes[index]),...fields};if(index===null)next.lanes.push(item);else next.lanes[index]=item;return next;}
export function deleteLane(document,index,reassign){const next=clone(document),lane=next.lanes[index];if(next.lanes.length<=1)throw new Error('Keep at least one lane.');if(!next.lanes.some(l=>l.id===reassign&&l.id!==lane.id))throw new Error('Choose another lane for affected nodes and groups.');for(const node of sourceNodes(next))if(node.lane===lane.id)node.lane=reassign;for(const group of next.groups||[])if(group.lane===lane.id)group.lane=reassign;next.lanes.splice(index,1);return next;}
