import React,{useEffect,useRef} from 'react';
export default function ContextActions({position,actions,onClose}) {
 const ref=useRef();useEffect(()=>{const previous=document.activeElement;ref.current.showModal();ref.current.querySelector('button:not(:disabled)')?.focus();return()=>previous?.isConnected&&previous.focus();},[]);
 return <dialog className="context-actions" ref={ref} aria-label="Component actions" style={{left:Math.max(8,Math.min(position.x,window.innerWidth-248)),top:Math.max(8,Math.min(position.y,window.innerHeight-330))}} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose();}}><strong>Component actions</strong>{actions.map(action=><button key={action.label} disabled={action.disabled} onClick={()=>{onClose();action.run();}}>{action.label}</button>)}<button onClick={onClose}>Close actions</button></dialog>;
}
