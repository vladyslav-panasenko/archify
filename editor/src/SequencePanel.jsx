import React, { useState } from "react";
import { addNode, deleteNode, componentKinds } from "./topology.mjs";
import {
  saveMessage,
  removeMessage,
  saveRange,
  removeRange,
  planSequenceRange,
} from "./sequence-structure.mjs";
function Participants({ document, name, value, label }) {
  return (
    <label className="field">
      {label}
      <select name={name} defaultValue={value}>
        {document.participants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export default function SequencePanel({ document, onChange, onSelect }) {
  const [rangePreview, setRangePreview] = useState(null), [rangeError, setRangeError] = useState("");
  return (
    <div className="properties">
      <h2>Sequence structure</h2>
      <details>
        <summary>Participants</summary>
        {document.participants.map((p) => (
          <div className="structure-item" key={p.id}>
            <span>{p.label}</span>
            <button onClick={() => onSelect([p.id])}>Edit {p.id}</button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${p.label}, ${document.messages.filter((m) => m.from === p.id || m.to === p.id).length} messages and ${(document.activations || []).filter((a) => a.participant === p.id).length} activations? Other ranges retain their Y coordinates.`,
                  )
                )
                  onChange(() => deleteNode(document, p.id));
              }}
            >
              Delete {p.id}
            </button>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onChange(() =>
              addNode(
                document,
                Object.fromEntries(new FormData(e.currentTarget)),
              ),
            );
          }}
        >
          <label className="field">
            Participant label
            <input name="label" required />
          </label>
          <label className="field">
            Participant type
            <select name="type">
              {componentKinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <button>Add participant</button>
        </form>
      </details>
      <details open>
        <summary>Messages</summary>
        <p className="muted">
          Y controls message order. Activations and segments retain their
          absolute Y ranges; confirm timing changes when ranges exist.
        </p>
        {[...document.messages, null].map((message, index) => (
          <details
            key={
              message
                ? `${index}:${JSON.stringify(message)}`
                : `new:${document.messages.length}`
            }
            open={!message}
          >
            <summary>{message?.label || "New message"}</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fields = Object.fromEntries(
                  new FormData(e.currentTarget),
                );
                const changed = !message || message.y !== Number(fields.y);
                const hasRanges =
                  document.activations?.length || document.segments?.length;
                if (
                  changed &&
                  hasRanges &&
                  !window.confirm(
                    "Change message timing while keeping activation and segment ranges at their current Y coordinates? This can change which messages fall within those ranges.",
                  )
                )
                  return;
                onChange(() =>
                  saveMessage(document, message ? index : null, fields, true),
                );
              }}
            >
              <Participants
                document={document}
                name="from"
                value={message?.from}
                label="Sender"
              />
              <Participants
                document={document}
                name="to"
                value={message?.to || document.participants.at(-1).id}
                label="Receiver"
              />
              <label className="field">
                Message text
                <input
                  name="label"
                  defaultValue={message?.label || ""}
                  required
                />
              </label>
              <label className="field">
                Timeline Y
                <input
                  name="y"
                  type="number"
                  min="160"
                  defaultValue={
                    message?.y ||
                    Math.max(...document.messages.map((m) => m.y)) + 60
                  }
                />
              </label>
              <label className="field">
                Message variant
                <select
                  name="variant"
                  defaultValue={message?.variant || "default"}
                >
                  {["default", "emphasis", "security", "dashed", "return"].map(
                    (k) => (
                      <option key={k}>{k}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="field">
                Note
                <input name="note" defaultValue={message?.note || ""} />
              </label>
              <button>{message ? "Save message" : "Create message"}</button>
              {message && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete this message? Activations and segments retain their Y ranges.",
                      )
                    )
                      onChange(() => removeMessage(document, index));
                  }}
                >
                  Delete message
                </button>
              )}
            </form>
          </details>
        ))}
      </details>
      <details>
        <summary>Shift or duplicate a message range</summary>
        <p className="muted">The preview includes only activations and segments fully contained by the chosen range. A partial dependency cancels the operation.</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          try { setRangePreview(planSequenceRange(document, Object.fromEntries(new FormData(event.currentTarget)))); setRangeError(""); }
          catch (error) { setRangePreview(null); setRangeError(error.message); }
        }}>
          <label className="field">From Y<input name="from" type="number" defaultValue={Math.min(...document.messages.map((message) => message.y))} /></label>
          <label className="field">To Y<input name="to" type="number" defaultValue={Math.max(...document.messages.map((message) => message.y))} /></label>
          <label className="field">Offset in pixels<input name="delta" type="number" defaultValue="60" /></label>
          <label className="field">Operation<select name="mode"><option value="shift">Shift range</option><option value="duplicate">Duplicate range</option></select></label>
          <button>Preview range operation</button>
        </form>
        {rangeError && <p role="alert">{rangeError}</p>}
        {rangePreview && <div className="preview-card"><p>{rangePreview.summary} Source JSON remains unchanged until Apply.</p><button onClick={() => setRangePreview(null)}>Cancel preview</button><button onClick={() => { onChange(() => rangePreview.document); setRangePreview(null); }}>Apply range operation</button></div>}
      </details>
      {["activations", "segments"].map((collection) => (
        <details key={collection}>
          <summary>
            {collection === "activations" ? "Activations" : "Segments"}
          </summary>
          {[...(document[collection] || []), null].map((range, index) => (
            <form
              key={range ? `${index}:${JSON.stringify(range)}` : "new"}
              onSubmit={(e) => {
                e.preventDefault();
                onChange(() =>
                  saveRange(
                    document,
                    collection,
                    range ? index : null,
                    Object.fromEntries(new FormData(e.currentTarget)),
                  ),
                );
              }}
            >
              <h3>
                {range
                  ? `Edit ${collection} ${index + 1}`
                  : `New ${collection}`}
              </h3>
              {collection === "activations" ? (
                <Participants
                  document={document}
                  name="participant"
                  value={range?.participant}
                  label="Activation participant"
                />
              ) : (
                <label className="field">
                  Segment label
                  <input
                    name="label"
                    required
                    defaultValue={range?.label || ""}
                  />
                </label>
              )}
              <label className="field">
                Range from
                <input
                  name="from"
                  type="number"
                  defaultValue={range?.from ?? 180}
                />
              </label>
              <label className="field">
                Range to
                <input
                  name="to"
                  type="number"
                  defaultValue={range?.to ?? 300}
                />
              </label>
              <button>{range ? "Save range" : "Create range"}</button>
              {range && (
                <button
                  type="button"
                  onClick={() =>
                    onChange(() => removeRange(document, collection, index))
                  }
                >
                  Delete range
                </button>
              )}
            </form>
          ))}
        </details>
      ))}
    </div>
  );
}
