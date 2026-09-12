import React from 'react';
export function readPanels(){try{const value=JSON.parse(localStorage.getItem('archify-panels:v1'));return {outline:Math.max(160,Math.min(360,Number(value?.outline)||220)),inspector:Math.max(240,Math.min(480,Number(value?.inspector)||290))};}catch{return {outline:220,inspector:290};}}
export default function PanelControls({value,onChange,focus,onFocus}) {
 return <><button aria-pressed={focus} onClick={()=>onFocus(!focus)}>{focus?'Exit focus mode':'Focus mode'}</button><details className="panel-controls"><summary>Panel sizes</summary><div>{[['outline','Outline width',160,360],['inspector','Inspector width',240,480]].map(([key,label,min,max])=><label key={key}>{label} · {value[key]} px<input aria-label={label} type="range" min={min} max={max} value={value[key]} onChange={e=>onChange({...value,[key]:Number(e.target.value)})}/></label>)}<small>Widths apply on wide screens.</small></div></details></>;
}
