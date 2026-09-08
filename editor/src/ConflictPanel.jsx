import React, { useState } from "react";
import { mergeDocuments, documentChanges } from "./review.mjs";
const show = (value) =>
  value === undefined ? "(deleted / absent)" : JSON.stringify(value, null, 2);
export default function ConflictPanel({
  conflict,
  onApply,
  onRefresh,
  onCancel,
}) {
  const [choices, setChoices] = useState({}),
    initial = mergeDocuments(conflict.base, conflict.local, conflict.remote),
    result = mergeDocuments(
      conflict.base,
      conflict.local,
      conflict.remote,
      choices,
    );
  return (
    <div className="properties">
      <h2>Source conflict</h2>
      <p>
        Your source changed outside the editor. Nonconflicting changes are
        combined; choose a version for every conflict.
      </p>
      <p className="muted">
        {documentChanges(conflict.base, conflict.local).length} local changes ·{" "}
        {documentChanges(conflict.base, conflict.remote).length} source changes.
        Collections without stable IDs are compared as whole arrays.
      </p>
      {initial.conflicts.map((item) => (
        <section className="change-entry" key={item.key}>
          <strong>{item.path.join(" / ") || "Document"}</strong>
          {["base", "local", "remote"].map((key) => (
            <React.Fragment key={key}>
              <span>
                {
                  {
                    base: "Original",
                    local: "Your draft",
                    remote: "Current source",
                  }[key]
                }
              </span>
              <pre>{show(item[key])}</pre>
            </React.Fragment>
          ))}
          <label className="field">
            Resolve {item.path.join(" / ") || "document"}
            <select
              value={choices[item.key] || ""}
              onChange={(e) =>
                setChoices({ ...choices, [item.key]: e.target.value })
              }
            >
              <option value="">Choose a version</option>
              <option value="local">Keep my draft</option>
              <option value="remote">Keep current source</option>
            </select>
          </label>
        </section>
      ))}
      <p>{result.conflicts.length} unresolved conflicts</p>
      <div className="review-actions">
        <button
          disabled={!!result.conflicts.length}
          onClick={() => onApply(result.document)}
        >
          Apply merged draft
        </button>
        <button onClick={onRefresh}>Refresh comparison</button>
        <button onClick={onCancel}>Cancel comparison</button>
      </div>
      <p className="muted">
        Applying validates the merged draft but does not write the file. Review
        and save afterwards; saving checks the source revision again.
      </p>
    </div>
  );
}
