import React, { useState } from "react";
import { serialize } from "./document.mjs";

export default function MigrationPanel({ document, onPreview, onApply, onDownload }) {
  const [proposal, setProposal] = useState(null), [busy, setBusy] = useState(false);
  const available = document.diagram_type === "workflow" && document.schema_version === 1;
  return <div className="properties">
    <h2>Schema migration</h2>
    <p>Migration is explicit. Opening, editing, saving, and rendering never change a schema version.</p>
    {!available && <p>No migration is available for this document.</p>}
    {available && !proposal && <button disabled={busy} onClick={async () => { setBusy(true); try { setProposal({ value: await onPreview(document) }); } catch (error) { setProposal({ error: error.message }); } finally { setBusy(false); } }}>{busy ? "Planning migration…" : "Preview workflow v1 → v2"}</button>}
    {proposal?.error && <p role="alert">{proposal.error}</p>}
    {proposal?.value && <>
      <p><strong>Version:</strong> 1 → 2</p>
      <p><strong>Mapped coordinates:</strong> {proposal.value.changedCoordinates.length}</p>
      <details><summary>Review exact JSON diff</summary><div className="migration-diff"><section><h3>Original</h3><pre>{serialize(document)}</pre></section><section><h3>Proposed</h3><pre>{serialize(proposal.value.document)}</pre></section></div></details>
      <div className="button-row">
        <button onClick={() => onDownload(document, "workflow-v1-original.json")}>Download recoverable original</button>
        <button onClick={() => setProposal(null)}>Cancel</button>
        <button className="primary" onClick={() => onApply(proposal.value.document)}>Apply migration</button>
      </div>
      <p>Apply creates one undo step. Save remains a separate action.</p>
    </>}
  </div>;
}
