import React, { useState } from "react";
import { defaultShortcuts, validateShortcuts } from "./shortcuts.mjs";
const labels = { commands: "Commands", save: "Save or download", duplicate: "Duplicate", selectAll: "Select all visible", undo: "Undo", redo: "Redo" };
export default function ShortcutsPanel({ value, onChange }) {
  const [draft, setDraft] = useState(value), [error, setError] = useState("");
  const save = (candidate) => { try { const next = validateShortcuts(candidate); localStorage.setItem("archify-shortcuts:v1", JSON.stringify(next)); setDraft(next); onChange(next); setError(""); } catch (e) { setError(e.message); } };
  return <div className="properties"><h2>Keyboard shortcuts</h2><p>Use Mod for Ctrl on Windows/Linux and Command on macOS. Preferences stay outside diagram JSON.</p>{error && <p role="alert">{error}</p>}<form onSubmit={(e) => { e.preventDefault(); save(draft); }}>{Object.entries(labels).map(([key, label]) => <label className="field" key={key}>{label}<input value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /></label>)}<div className="button-row"><button type="button" onClick={() => save(defaultShortcuts)}>Reset defaults</button><button className="primary">Save shortcuts</button></div></form></div>;
}
