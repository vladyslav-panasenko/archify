import React,{useEffect,useState} from 'react';
export default function WorkspacePanel({id,disabled,onSwitch,pendingCount}) {
  const [files,setFiles]=useState([]),[error,setError]=useState(''),[skipped,setSkipped]=useState(0),[loading,setLoading]=useState(false);
  async function refresh(){setLoading(true);try{const r=await fetch('/api/workspace');const data=await r.json();if(!r.ok)throw new Error(data.error);setFiles(data.files);setSkipped(data.skipped);setError('');}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{refresh();},[]);
  return <section className="workspace-picker"><label className="field">Project diagram<select value={id||''} disabled={disabled||loading} onChange={e=>onSwitch(e.target.value)}><option value="" disabled>Choose a diagram</option>{files.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><button disabled={disabled||loading} onClick={refresh}>Refresh files</button>{pendingCount>0&&<p>{pendingCount} other file drafts have unsaved changes.</p>}{skipped>0&&<p>{skipped} invalid or oversized JSON files skipped.</p>}{error&&<p role="alert">{error}</p>}</section>;
}
