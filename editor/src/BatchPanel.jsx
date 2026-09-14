import React, { useEffect, useRef, useState } from "react";
export default function BatchPanel({ token }) {
  const [files, setFiles] = useState([]), [selected, setSelected] = useState([]), [operation, setOperation] = useState("validate"),
    [destination, setDestination] = useState(""), [overwrite, setOverwrite] = useState(false), [results, setResults] = useState([]),
    [error, setError] = useState(""), [pending, setPending] = useState(false);
  const controller = useRef(null);
  useEffect(() => { fetch("/api/workspace").then((response) => response.json()).then((data) => setFiles(data.files || [])).catch((cause) => setError(cause.message)); return () => controller.current?.abort(); }, []);
  async function run() {
    setPending(true); setError(""); setResults([]); controller.current = new AbortController();
    try {
      const response = await fetch("/api/batch", { method: "POST", signal: controller.current.signal, headers: { "Content-Type": "application/json", "X-Editor-Token": token }, body: JSON.stringify({ ids: selected, operation, destination, overwrite }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setResults(data.results);
    } catch (cause) { setError(cause.name === "AbortError" ? "Batch cancelled. Completed files remain listed; existing exports were not rolled back." : cause.message); }
    finally { setPending(false); controller.current = null; }
  }
  return <div className="properties"><h2>Batch validation and HTML export</h2><p>Process up to 100 selected workspace files. Each file reports its own result. Exports stay in an existing project folder.</p>
    {error && <p role="alert">{error}</p>}
    <div className="button-row"><button disabled={pending} onClick={() => setSelected(files.map((file) => file.id))}>Select all</button><button disabled={pending} onClick={() => setSelected([])}>Clear</button></div>
    <div className="batch-files">{files.map((file) => <label key={file.id}><input type="checkbox" disabled={pending} checked={selected.includes(file.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, file.id] : selected.filter((id) => id !== file.id))} /> {file.name} <small>{file.type}</small></label>)}</div>
    <label className="field">Operation<select disabled={pending} value={operation} onChange={(event) => setOperation(event.target.value)}><option value="validate">Validate only</option><option value="export">Render HTML files</option></select></label>
    {operation === "export" && <><label className="field">Existing destination folder<input disabled={pending} value={destination} placeholder="exports" onChange={(event) => setDestination(event.target.value)} /></label><label><input disabled={pending} type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} /> Replace existing HTML with the same name</label></>}
    {pending ? <button onClick={() => controller.current?.abort()}>Cancel batch</button> : <button disabled={!selected.length} onClick={run}>Run {operation}</button>}
    {results.length > 0 && <table><thead><tr><th>File</th><th>Result</th></tr></thead><tbody>{results.map((result) => <tr key={result.id}><td>{result.name}</td><td>{result.status === "ok" ? result.output || "Valid" : result.error}</td></tr>)}</tbody></table>}
  </div>;
}
