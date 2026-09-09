import React from 'react';
export const panelGroups=[
  {label:'Edit',panels:{inspector:'Properties',structure:'Structure',layout:'Auto-arrange',templates:'Templates'}},
  {label:'Inspect',panels:{json:'JSON',search:'Search',problems:'Problems',compare:'Compare layout',review:'Review'}},
  {label:'Document',panels:{settings:'Settings',checkpoints:'Checkpoints'}},
];
export const panelLabels=Object.assign({},...panelGroups.map(g=>g.panels));
export default function EditorNavigation({panel,disabled,onSelect}) {
  return <nav className="editor-navigation" aria-label="Inspector sections"><details open><summary>Tools · {panelLabels[panel]||'Document'}</summary><div className="tabs">{panelGroups.map(group=><div className="panel-group" key={group.label}><span>{group.label}</span><div>{Object.entries(group.panels).map(([key,label])=><button key={key} className={panel===key?'active':''} aria-pressed={panel===key} disabled={disabled(key)} onClick={()=>onSelect(key)}>{label}</button>)}</div></div>)}</div></details></nav>;
}
