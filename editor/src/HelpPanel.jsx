import React, { useMemo, useState } from "react";
import { supportBundle } from "./support-bundle.mjs";
import { rtlLimitation } from "./localization.mjs";
const topics = [
  ["Files and drafts", "Open JSON creates a downloadable draft. --file enables one direct save target; --directory confines workspace operations. Recovery is local and is not a backup."],
  ["Save conflicts", "Save checks the opened revision before and during replacement. Compare external changes, resolve every conflict, then review and save."],
  ["Routes", "Architecture supports authored waypoints, segments, labels and endpoint sides. Automatic final routing belongs to the compiler."],
  ["Schema constraints", "Constrained diagrams use lanes, stages, rows, columns and timeline coordinates. Unsupported source opens read-only and stays downloadable."],
  ["Keyboard", "Ctrl/Cmd+K commands; Ctrl/Cmd+S save; Ctrl/Cmd+Z undo; Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo; arrows nudge; Shift+arrows move ten; Escape cancels."],
  ["Canvas and compiler", "The canvas is an editing projection. Render HTML is the final reference for routing, typography, themes and delivery exports."],
  ["Recovery storage", "Export important checkpoints before clearing browser data. Storage failures preserve existing records and ask you to save or download JSON."],
  ["Language and text direction", rtlLimitation],
];
export default function HelpPanel({ session, document, errors, notice, onDownload }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => topics.filter((item) => item.join(" ").toLowerCase().includes(query.toLowerCase())), [query]);
  const bundle = supportBundle({ session, document, errors, notice, userAgent: navigator.userAgent });
  const text = JSON.stringify(bundle, null, 2) + "\n";
  return <div className="properties">
    <h2>Help and diagnostics</h2>
    <label className="field">Search help<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
    {visible.map(([title, body]) => <section key={title}><h3>{title}</h3><p>{body}</p></section>)}
    {!visible.length && <p>No help topics match. Try “save”, “route”, “schema”, or “keyboard”.</p>}
    <h3>Support bundle</h3>
    <p>Review the complete bundle below before exporting. It excludes diagram content and local paths.</p>
    <details><summary>Review diagnostic content</summary><pre>{text}</pre></details>
    <button onClick={() => onDownload(text, "archify-editor-support.json")}>Download reviewed support bundle</button>
  </div>;
}
