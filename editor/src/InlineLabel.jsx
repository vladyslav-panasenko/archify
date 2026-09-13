import React, { useState } from "react";
export default function InlineLabel({ label, enabled, onApply }) {
  const [value, setValue] = useState(null), [error, setError] = useState("");
  const start = (event) => { event.stopPropagation(); if (enabled) { setValue(label); setError(""); } };
  if (value === null)
    return <strong className="inline-label-trigger" title="Double-click to edit. The Properties field is the keyboard alternative." onDoubleClick={start}>{label}</strong>;
  const apply = () => {
    const next = value.trim();
    if (!next) { setError("A label is required."); return; }
    onApply(next); setValue(null); setError("");
  };
  return <span className="inline-label-editor nodrag nopan">
    <input aria-label="Edit canvas label" aria-invalid={!!error} aria-describedby="inline-label-help" autoFocus value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} onBlur={() => setValue(null)} onDoubleClick={(e) => e.stopPropagation()} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") { e.preventDefault(); setValue(null); } if (e.key === "Enter") { e.preventDefault(); apply(); } }} />
    <small id="inline-label-help">Enter saves · Escape or leaving the field cancels</small>
    {error && <small role="alert">{error}</small>}
  </span>;
}
