import React, { useState } from "react";
import { addCheckpoint, readCheckpoints, exportRecoveryBundle, importCheckpointBundle } from "./checkpoints.mjs";
export default function CheckpointsPanel({
  document,
  historyData,
  storageKey,
  onRestore,
  onImportDraft,
  onExport,
}) {
  const key = `archify-checkpoints:${storageKey}`;
  const [initial] = useState(() => {
    try {
      return { entries: readCheckpoints(localStorage, key) };
    } catch (e) {
      return { entries: [], error: e.message };
    }
  });
  const [entries, setEntries] = useState(initial.entries),
    [error, setError] = useState(initial.error || ""),
    [name, setName] = useState(""), [selected, setSelected] = useState([]),
    [retention, setRetention] = useState(10), [includeHistory, setIncludeHistory] = useState(true);
  const write = (next) => {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setEntries(next);
      setError("");
      return true;
    } catch {
      setError(
        "Browser storage is full or unavailable. Existing checkpoints have not been changed.",
      );
      return false;
    }
  };
  return (
    <div className="properties">
      <h2>Local checkpoints</h2>
      <p className="muted">
        Up to the chosen retention limit and 2 MB per document in this browser. Clearing
        browser storage removes them. Export checkpoints you want to keep.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="button-row">
        <button onClick={() => { try { const chosen = selected.length ? entries.filter((entry) => selected.includes(entry.id)) : entries; onExport(exportRecoveryBundle({ document, historyData, checkpoints: chosen, includeHistory }), "archify-recovery.json"); } catch (cause) { setError(cause.message); } }}>Export recovery bundle</button>
        <button disabled={!selected.length} onClick={() => { if (window.confirm(`Delete ${selected.length} selected local checkpoints?`)) { write(entries.filter((entry) => !selected.includes(entry.id))); setSelected([]); } }}>Delete selected</button>
        <label className="button-like">Import recovery<input hidden type="file" accept=".json,application/json" onChange={async (e) => { const file=e.target.files[0];e.target.value="";if(!file)return;try{if(file.size>2*1024*1024)throw new Error("Recovery bundle exceeds 2 MB.");const bundle=JSON.parse(await file.text());let next;try{next=importCheckpointBundle(entries,bundle);}catch(error){if(!error.collisions||!window.confirm(`${error.message} Replace matching checkpoints?`))throw error;next=importCheckpointBundle(entries,bundle,true);}write(next);if(bundle.version===2&&bundle.draft?.document&&window.confirm("This bundle contains a draft. Restore it with any included history?"))await onImportDraft(bundle.draft);}catch(error){setError(error.message);}}}/></label>
      </div>
      <label className="field">Checkpoint retention · {retention}<input type="range" min="1" max="10" value={retention} onChange={(event) => setRetention(Number(event.target.value))} /></label>
      <label><input type="checkbox" checked={includeHistory} onChange={(event) => setIncludeHistory(event.target.checked)} /> Include up to 20 undo/redo states in exports</label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (write(addCheckpoint(entries, name, document, retention))) setName("");
          } catch (error) {
            setError(error.message);
          }
        }}
      >
        <label className="field">
          Checkpoint name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength="80"
          />
        </label>
        <button disabled={!!initial.error}>Create checkpoint</button>
      </form>
      {entries.map((entry) => (
        <section className="checkpoint" key={entry.id}>
          <h3><label><input type="checkbox" checked={selected.includes(entry.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, entry.id] : selected.filter((id) => id !== entry.id))} /> {entry.name}</label></h3>
          <time dateTime={entry.created}>
            {new Date(entry.created).toLocaleString()}
          </time>
          <small>{new Blob([JSON.stringify(entry)]).size.toLocaleString()} bytes</small>
          <div className="review-actions">
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Restore “${entry.name}” as the current draft? Undo restores your current work. The source file will not be written.`,
                  )
                )
                  onRestore(entry.document);
              }}
            >
              Restore {entry.name}
            </button>
            <button
              onClick={() =>
                onExport(
                  entry.document,
                  `${entry.name.replace(/[^a-z0-9_-]/gi, "_")}.json`,
                )
              }
            >
              Export {entry.name}
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete local checkpoint “${entry.name}”?`))
                  write(entries.filter((c) => c.id !== entry.id));
              }}
            >
              Delete {entry.name}
            </button>
          </div>
        </section>
      ))}
      {!entries.length && !initial.error && (
        <p>No checkpoints for this document.</p>
      )}
    </div>
  );
}
