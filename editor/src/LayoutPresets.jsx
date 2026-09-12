import React,{useState} from 'react';
import {readPresets,savePreset,presetKey} from './layout-presets.mjs';
export default function LayoutPresets({settings,onApply,disabled}) {
 const [entries,setEntries]=useState(()=>readPresets(localStorage)),[name,setName]=useState(''),[error,setError]=useState('');
 return <fieldset disabled={disabled}><details><summary>Layout presets</summary><p className="muted">Local layout and snapping preferences. Saving the same name replaces that preset.</p><label className="field">Preset name<input value={name} maxLength={60} onChange={e=>setName(e.target.value)}/></label><button onClick={()=>{try{setEntries(savePreset(localStorage,name,settings));setError('');}catch(e){setError(e.message);}}}>Save layout preset</button>{error&&<p role="alert">{error}</p>}{entries.map(p=><div className="button-row" key={p.name}><button onClick={()=>onApply(p.settings)}>Use {p.name}</button><button aria-label={`Delete preset ${p.name}`} onClick={()=>{try{const next=entries.filter(v=>v.name!==p.name);localStorage.setItem(presetKey,JSON.stringify(next));setEntries(next);}catch(e){setError(e.message);}}}>Delete</button></div>)}</details></fieldset>;
}
