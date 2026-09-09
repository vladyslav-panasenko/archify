import React from 'react';
export default function ProblemsPanel({issues,activeKey,onFocus,onJson,onCheck,stale,checked}) {
  const active=issues.findIndex(p=>p.key===activeKey);
  return <div className="properties"><h2>Problems</h2><p>Layout checks update after each edit. Run Archify checks for route and label diagnostics.</p><button onClick={onCheck}>Run compiler checks</button>{stale&&<p role="alert">Compiler results are stale. Run checks again for this draft.</p>}{checked&&!stale&&!issues.some(p=>p.kind==='compiler')&&<p>Compiler checks passed.</p>}
    <div className="review-actions"><button disabled={!issues.length} onClick={()=>onFocus(issues[active<0?issues.length-1:(active-1+issues.length)%issues.length])}>Previous problem</button><button disabled={!issues.length} onClick={()=>onFocus(issues[(active+1)%issues.length])}>Next problem</button></div>
    {!issues.length&&<p>No reported problems.</p>}{issues.map(p=><section key={p.key} className="problem-item"><button aria-pressed={p.key===activeKey} onClick={()=>onFocus(p)}>{p.message}</button><small>{p.kind}{p.kind==='compiler'&&stale?' · stale':''}</small>{!p.ids.length&&<button onClick={onJson}>Open JSON for this issue</button>}{p.fixes.length>0&&<ul>{p.fixes.map((f,i)=><li key={i}>{f}</li>)}</ul>}</section>)}
  </div>;
}

