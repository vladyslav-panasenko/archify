import React, { useState } from "react";
import { importMermaid, exportMermaid } from "./mermaid-interchange.mjs";

export default function InterchangePanel({ document, onImport, onDownload }) {
  const [text, setText] = useState("flowchart LR\n  client[Client] -->|calls| api[API]\n"), [report, setReport] = useState([]), [error, setError] = useState("");
  const run = (action) => { try { action(); setError(""); } catch (cause) { setError(cause.message); } };
  return <div className="properties"><h2>Mermaid interchange</h2><p>Imports and exports a bounded Mermaid flowchart subset. Review the loss report before replacing a source or sharing an export.</p>{error && <p role="alert">{error}</p>}<label className="field">Mermaid flowchart<textarea value={text} onChange={(event) => setText(event.target.value)} /></label><div className="button-row"><button onClick={() => run(() => { const result = importMermaid(text); setReport(result.losses); onImport(result.document, result.losses); })}>Import as architecture</button><button disabled={document.diagram_type !== "architecture"} onClick={() => run(() => { const result = exportMermaid(document); setText(result.text); setReport(result.losses); onDownload(result.text, "diagram.mmd", "text/plain"); })}>Export Mermaid</button></div>{report.length > 0 && <><h3>Loss report</h3><ul>{report.map((entry, index) => <li key={index}>{entry.field || entry.line}: {entry.reason}</li>)}</ul></>}</div>;
}
