import React,{useEffect,useState} from 'react';
import {compareLayout,acceptLayout} from './layout-comparison.mjs';
export default function ComparePanel({document,locked,onValidate,onApply,onPreview}) {
  const [candidate,setCandidate]=useState(null),[choices,setChoices]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>()=>onPreview(null),[]);
  const changes=candidate?compareLayout(document,candidate,locked):[];
  const preview=(candidate,keys)=>{try{onPreview(acceptLayout(document,candidate,keys,locked));setError('');}catch(e){onPreview(null);setError(e.message);}};
  return <div className="properties"><h2>Compare placement</h2><p>Load another version with the same node IDs, endpoints and lanes. Choose which placements to accept. Dashed orange boxes show proposed canvas positions. Labels, topology and authored routes stay as they are.</p>
    <p>Sequence participant order is one choice. Message timing and routing are not copied. Locked components are excluded.</p>
    {error&&<p role="alert">{error}</p>}<fieldset disabled={busy}>
    <label className="field">Compare layout JSON<input type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;setBusy(true);try{if(file.size>5*1024*1024)throw new Error('JSON exceeds 5 MB.');const next=JSON.parse(await file.text());await onValidate(next);compareLayout(document,next,locked);setCandidate(next);setChoices([]);onPreview(null);setError('');}catch(e){setError(e.message);}finally{setBusy(false);}}}/></label>
    {changes.map(change=><label className="comparison-choice" key={change.key}><input type="checkbox" checked={choices.includes(change.key)} onChange={e=>{const next=e.target.checked?[...choices,change.key]:choices.filter(k=>k!==change.key);setChoices(next);preview(candidate,next);}}/><span>{change.label}<small>{change.fields.join(', ')}</small></span></label>)}
    {candidate&&!changes.length&&<p>No supported placement differences for unlocked items.</p>}
    {candidate&&<div className="review-actions"><button onClick={()=>{setCandidate(null);setChoices([]);onPreview(null);}}>Cancel comparison</button><button disabled={!choices.length||!!error} onClick={async()=>{setBusy(true);try{const next=acceptLayout(document,candidate,choices,locked);await onValidate(next);onApply(next);onPreview(null);}catch(e){setError(e.message);}finally{setBusy(false);}}}>Accept selected placements</button></div>}
    </fieldset></div>;
}
