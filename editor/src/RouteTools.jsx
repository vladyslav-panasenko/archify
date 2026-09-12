import React,{useState} from "react";
import {insertConnection} from './insert-connection.mjs';
import { simplifyRoute } from "./segments.mjs";
export default function RouteTools({
  document,
  index,
  preview,
  disabled,
  onPreview,
  onApply,
}) {
  const [label,setLabel]=useState('New component');
  return (
    <fieldset
      className="canvas-route-tools"
      disabled={disabled}
      aria-label="Route cleanup"
    >
      {preview ? (
        <>
          <span>{preview.kind==='insert'?'Insertion':'Route'} preview · JSON unchanged</span>
          <button onClick={() => onPreview(null)}>Cancel route</button>
          <button onClick={() => onApply(preview.document)}>Apply route</button>
        </>
      ) : (
        <>
          <button
            onClick={() =>
              onPreview({ index, document: simplifyRoute(document, index) })
            }
          >
            Preview simplified route
          </button>
          <button
            onClick={() =>
              onPreview({
                index,
                document: simplifyRoute(document, index, "straight"),
              })
            }
          >
            Preview straight route
          </button>
          <details><summary>Insert component</summary><p>The original label and metadata stay on the incoming connection. The outgoing connection gets a fresh ID and no label. Both halves use automatic routing; the new box is placed between endpoints. Inspect for overlaps before applying.</p><label>Inserted component label<input value={label} onChange={e=>setLabel(e.target.value)} /></label><button disabled={!label.trim()} onClick={()=>onPreview({index,kind:'insert',document:insertConnection(document,index,label.trim())})}>Preview insertion</button></details>
        </>
      )}
    </fieldset>
  );
}
