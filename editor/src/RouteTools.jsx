import React from 'react';
import {simplifyRoute} from './segments.mjs';
export default function RouteTools({document,index,preview,disabled,onPreview,onApply}) {
 return <fieldset className="canvas-route-tools" disabled={disabled} aria-label="Route cleanup">{preview?<><span>Route preview · JSON unchanged</span><button onClick={()=>onPreview(null)}>Cancel route</button><button onClick={()=>onApply(preview.document)}>Apply route</button></>:<><button onClick={()=>onPreview({index,document:simplifyRoute(document,index)})}>Preview simplified route</button><button onClick={()=>onPreview({index,document:simplifyRoute(document,index,'straight')})}>Preview straight route</button></>}</fieldset>;
}
