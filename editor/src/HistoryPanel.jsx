import React, { useMemo } from "react";
import { historyEntries } from "./history-labels.mjs";
export default function HistoryPanel({ state, disabled, onJump }) {
  const entries = useMemo(() => historyEntries(state), [state]);
  return (
    <div className="properties">
      <h2>Edit history</h2>
      <p className="muted">
        Up to 100 edits in this session. Jump backward or forward; a new edit
        replaces future states. Reloading clears history.
      </p>
      <ol className="history-list">
        {entries.map((entry) => (
          <li key={entry.index}>
            <button
              disabled={disabled || entry.status === "Current"}
              aria-current={entry.status === "Current" ? "step" : undefined}
              onClick={() => onJump(entry.index)}
            >
              <span>
                {entry.index}. {entry.label}
              </span>
              <small>{entry.status}</small>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
