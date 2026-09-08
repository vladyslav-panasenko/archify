import React, { useState } from "react";
import { addCheckpoint, readCheckpoints } from "./checkpoints.mjs";
export default function CheckpointsPanel({
  document,
  storageKey,
  onRestore,
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
    [name, setName] = useState("");
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
        Up to 10 snapshots and 2 MB per document in this browser. Clearing
        browser storage removes them. Export checkpoints you want to keep.
      </p>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (write(addCheckpoint(entries, name, document))) setName("");
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
          <h3>{entry.name}</h3>
          <time dateTime={entry.created}>
            {new Date(entry.created).toLocaleString()}
          </time>
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
