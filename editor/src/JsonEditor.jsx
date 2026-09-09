import React,{useMemo,useRef,useState} from 'react';
import {inspectJson,pathAt,suggestions,insertSuggestion,lineAt} from './json-source.mjs';
export default function JsonEditor({text,onChange,selectedPath,onFocus,children,busy}) {
  const index=useMemo(()=>inspectJson(text),[text]),[caret,setCaret]=useState(0),[choice,setChoice]=useState(''),input=useRef();
  const path=index.ranges?pathAt(index.ranges,caret):'',options=suggestions(index,path);
  const jump=offset=>{input.current.focus();input.current.setSelectionRange(offset,offset);input.current.scrollTop=Math.max(0,(lineAt(text,offset)-4)*18);setCaret(offset);};
  return <div className="json-panel"><p>Edit source, then apply it. Suggestions modify unapplied text.</p>
    <div className="review-actions"><button disabled={!index.ranges?.has(selectedPath)||!selectedPath} onClick={()=>jump(index.ranges.get(selectedPath).start)}>Locate canvas selection</button><button disabled={!index.ranges||!/^\/(components|nodes|states|participants|connections|edges|flows|transitions|messages)\/\d+/.test(path)} onClick={()=>onFocus(path,index.value)}>Focus item on canvas</button></div>
    <label className="field">Schema suggestions at {path||'/'}<select disabled={busy} value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Choose a field or value</option>{options.map((o,i)=><option value={i} key={`${path}:${o.label}`}>{o.label}{o.required?' (required)':''}</option>)}</select></label>
    <button disabled={busy||choice===''||!options[Number(choice)]} onClick={()=>{onChange(insertSuggestion(text,index,path,options[Number(choice)]));setChoice('');}}>Insert suggestion</button>
    <textarea disabled={busy} ref={input} aria-label="Diagram JSON" spellCheck={false} value={text} onChange={e=>onChange(e.target.value)} onSelect={e=>{setCaret(e.target.selectionStart);setChoice('');}}/>
    <div className="json-issues" aria-label="JSON validation issues">{index.issues.slice(0,10).map((issue,i)=><button key={i} onClick={()=>jump(issue.start)}>Line {issue.line} {issue.path||'/'}: {issue.message}</button>)}{index.issues.length>10&&<p>{index.issues.length-10} more errors. Fix earlier errors first.</p>}{!index.issues.length&&<p>Schema valid. Apply also checks diagram references.</p>}</div>
    {children}
  </div>;
}
