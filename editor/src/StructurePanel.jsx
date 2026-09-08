import React from 'react';
import { saveBoundary, deleteBoundary, moveBoundary } from './structure.mjs';
import TopologyPanel from './TopologyPanel.jsx';
import SequencePanel from './SequencePanel.jsx';
import ViewsPanel from './ViewsPanel.jsx';

function BoundaryForm({document,boundary,index,onChange,onSelect}) {
 return <details open={index===null}><summary>{boundary?.label||'New boundary'}</summary><form onSubmit={event=>{
  event.preventDefault();const data=new FormData(event.currentTarget);onChange(()=>saveBoundary(document,index,{label:data.get('label'),kind:data.get('kind'),pad:Number(data.get('pad')),wraps:data.getAll('members')}));
 }}><label className="field">Boundary label<input name="label" defaultValue={boundary?.label||''} required/></label><label className="field">Boundary kind<select name="kind" defaultValue={boundary?.kind||'region'}><option>region</option><option>security-group</option></select></label><label className="field">Padding<input name="pad" type="number" min="0" defaultValue={boundary?.pad??30}/></label><fieldset><legend>Members</legend>{document.components.map(c=><label className="member-choice" key={c.id}><input type="checkbox" name="members" value={c.id} defaultChecked={boundary?.wraps.includes(c.id)}/>{c.label}</label>)}</fieldset><button type="submit">{index===null?'Create boundary':'Save boundary'}</button></form>
 {index!==null&&<><div className="button-row"><button onClick={()=>onSelect(boundary.wraps)}>Select members</button><button onClick={()=>onChange(()=>deleteBoundary(document,index))}>Delete boundary</button></div><form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);onChange(()=>moveBoundary(document,index,Number(data.get('dx')),Number(data.get('dy'))));}}><div className="field-grid"><label className="field">Move X<input name="dx" type="number" defaultValue="0"/></label><label className="field">Move Y<input name="dy" type="number" defaultValue="0"/></label></div><button>Move members</button></form></>}
 </details>;
}
export default function StructurePanel({document,onChange,onSelect}) {
 if(document.diagram_type==='sequence')return <SequencePanel document={document} onChange={onChange} onSelect={onSelect}/>;
 if(document.diagram_type!=='architecture')return <TopologyPanel document={document} onChange={onChange} onSelect={onSelect}/>;
 return <div className="properties"><ViewsPanel document={document} onChange={onChange} onSelect={onSelect}/><h2>Boundaries</h2><p className="muted">Select members to drag them together, or enter an offset. Deleting a boundary keeps its components.</p>{(document.boundaries||[]).map((b,index)=><BoundaryForm key={`${index}:${JSON.stringify(b)}`} document={document} boundary={b} index={index} onChange={onChange} onSelect={onSelect}/>)}<BoundaryForm key={`new:${document.boundaries?.length||0}`} document={document} index={null} onChange={onChange}/></div>;
}
