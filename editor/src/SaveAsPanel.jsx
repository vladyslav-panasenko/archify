import React, { useState } from "react";
export default function SaveAsPanel({ enabled, onSave }) {
  const [name, setName] = useState(""),
    [conflict, setConflict] = useState(null),
    [error, setError] = useState("");
  const save = async (revision) => {
    try {
      await onSave(name, revision);
      setConflict(null);
      setError("");
    } catch (e) {
      setError(e.message);
      setConflict(e.conflict || null);
    }
  };
  return (
    <div className="properties">
      <h2>Create / Save As</h2>
      {!enabled ? (
        <p>
          Start the editor with --directory to create project files. Download
          JSON remains available.
        </p>
      ) : (
        <>
          <p>
            Save the current applied diagram under a new name in the opened
            directory. Existing subfolders are supported. Other document drafts
            stay available.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label className="field">
              Project filename
              <input
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setConflict(null);
                  setError("");
                }}
                placeholder="service.architecture.json"
                maxLength={240}
              />
            </label>
            <button>Save as project file</button>
          </form>
          {error && <p role="alert">{error}</p>}
          {conflict?.exists && (
            <section className="replacement-review">
              <h3>Replace {conflict.name}?</h3>
              <p>
                This writes your current diagram over that file. Replacement
                proceeds only if its revision still matches.
              </p>
              <code>{conflict.revision.slice(0, 12)}</code>
              <button onClick={() => save(conflict.revision)}>
                Replace existing file
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
