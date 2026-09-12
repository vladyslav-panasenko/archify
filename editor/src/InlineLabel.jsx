import React,{useState} from 'react';
export default function InlineLabel({label,enabled,onApply}) {
 const [value,setValue]=useState(null);
 if(value===null)return <strong onDoubleClick={e=>{e.stopPropagation();if(enabled)setValue(label);}}>{label}</strong>;
 return <input className="nodrag nopan inline-label" aria-label="Edit canvas label" autoFocus value={value} onChange={e=>setValue(e.target.value)} onBlur={()=>setValue(null)} onDoubleClick={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();setValue(null);}if(e.key==='Enter'){e.preventDefault();if(enabled&&value.trim()){onApply(value.trim());setValue(null);}}}} />;
}
