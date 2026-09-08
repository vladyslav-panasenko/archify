import { clone, components, moveComponents } from './document.mjs';
export function saveBoundary(document,index,values) {
 const next=clone(document), wraps=[...new Set(values.wraps)];
 if(!values.label.trim()||!wraps.length)throw new Error('A boundary needs a label and at least one member.');
 if(wraps.some(id=>!next.components.some(c=>c.id===id)))throw new Error('Boundary references a missing component.');
 if(!['region','security-group'].includes(values.kind)||!Number.isFinite(values.pad)||values.pad<0)throw new Error('Choose a valid boundary kind and nonnegative padding.');
 next.boundaries||=[];const item={...(next.boundaries[index]||{}),...values,wraps};
 if(index===null)next.boundaries.push(item);else next.boundaries[index]=item;
 return next;
}
export function deleteBoundary(document,index){const next=clone(document);next.boundaries.splice(index,1);return next;}
export function moveBoundary(document,index,dx,dy){if(![dx,dy].every(Number.isFinite))throw new Error('Offsets must be finite.');const ids=document.boundaries[index].wraps;return moveComponents(document,new Map(components(document).filter(c=>ids.includes(c.id)).map(c=>[c.id,[c.pos[0]+dx,c.pos[1]+dy]])));}
