import React from "react";
export const sampleTypes = ["architecture", "workflow", "dataflow", "lifecycle", "sequence"];
export default function SamplesPanel({ onOpen }) {
  return <div className="properties">
    <h2>Starter gallery</h2>
    <p>Starters are new editable drafts. They do not write a local file until you use Save As, and they never replace an imported document.</p>
    <div className="sample-gallery">
      {sampleTypes.map((type) => <button key={type} onClick={() => onOpen(type)}><strong>{type[0].toUpperCase() + type.slice(1)}</strong><small>Open editable starter</small></button>)}
    </div>
    <p>Open JSON imports a separate downloadable draft. Start the editor with <code>--file</code> for one writable file or <code>--directory</code> for a confined project workspace.</p>
  </div>;
}
