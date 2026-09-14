import React, { useEffect, useMemo, useState } from "react";

const RECENT_KEY = "archify-workspace-recent:v1";
function readRecent() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(value) ? value.slice(0, 12) : [];
  } catch { return []; }
}
function rememberRecent(file) {
  if (!file) return;
  try {
    const next = [file, ...readRecent().filter((item) => item.id !== file.id)].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* Optional machine-local convenience state. */ }
}

export default function WorkspacePanel({ id, disabled, onSwitch, onRename, pendingCount, token, revision, projectPreferences, onApplyProjectPreferences }) {
  const [files, setFiles] = useState([]), [folders, setFolders] = useState([]),
    [error, setError] = useState(""), [skipped, setSkipped] = useState(0),
    [loading, setLoading] = useState(false), [filter, setFilter] = useState(""),
    [results, setResults] = useState(null), [folderName, setFolderName] = useState(""),
    [moveName, setMoveName] = useState(""), [sharedPreferences, setSharedPreferences] = useState(null), [preferencesRevision, setPreferencesRevision] = useState(null);
  const recent = useMemo(() => readRecent().filter((item) => files.some((file) => file.id === item.id)), [files, id]);
  const visible = files.filter((file) => file.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));

  async function refresh() {
    setLoading(true);
    try {
      const [response, preferencesResponse] = await Promise.all([fetch("/api/workspace"), fetch("/api/project-preferences")]), data = await response.json(), preferencesData = await preferencesResponse.json();
      if (!response.ok) throw new Error(data.error);
      if (!preferencesResponse.ok) throw new Error(preferencesData.error);
      setFiles(data.files); setFolders(data.folders || []); setSkipped(data.skipped); setError("");
      setSharedPreferences(preferencesData.preferences); setPreferencesRevision(preferencesData.revision);
      const current = data.files.find((file) => file.id === id);
      if (current) { rememberRecent(current); setMoveName((value) => value || current.name); }
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [id]);

  async function post(path, body) {
    setLoading(true);
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "X-Editor-Token": token }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setError(""); return data;
    } catch (cause) { setError(cause.message); return null; }
    finally { setLoading(false); }
  }
  async function createFolder(event) {
    event.preventDefault();
    const data = await post("/api/workspace/folder", { name: folderName });
    if (data) { setFolderName(""); await refresh(); }
  }
  async function move(event) {
    event.preventDefault();
    const data = await post("/api/workspace/rename", { id, name: moveName, revision });
    if (data) { await onRename(data); rememberRecent({ id: data.workspaceId, name: data.name }); await refresh(); }
  }
  async function search(event) {
    event.preventDefault();
    if (!filter.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/workspace/search?q=${encodeURIComponent(filter)}`), data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(data.results); setError("");
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }
  async function saveProjectPreferences() {
    const data = await post("/api/project-preferences", { preferences: projectPreferences, revision: preferencesRevision });
    if (data) { setSharedPreferences(data.preferences); setPreferencesRevision(data.revision); }
  }
  function choose(nextId) {
    const file = files.find((item) => item.id === nextId);
    rememberRecent(file);
    if (file) setMoveName(file.name);
    onSwitch(nextId);
  }

  return (
    <section className="workspace-picker">
      <h2>Project files</h2>
      <form className="workspace-search" onSubmit={search}>
        <label className="field">Find files and content
          <input value={filter} maxLength={120} placeholder="Path, ID, label, metadata" onChange={(event) => { setFilter(event.target.value); setResults(null); }} />
        </label>
        <button disabled={disabled || loading || !filter.trim()}>Search content</button>
      </form>
      {recent.length > 0 && <div className="workspace-recents"><span>Recent</span>{recent.map((file) => <button key={file.id} disabled={disabled || file.id === id} onClick={() => choose(file.id)}>{file.name}</button>)}</div>}
      <label className="field">Project diagram
        <select value={id || ""} disabled={disabled} onChange={(event) => choose(event.target.value)}>
          <option value="" disabled>Choose a diagram</option>
          {visible.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}
        </select>
      </label>
      {results && <div className="workspace-results" aria-live="polite">
        <strong>{results.length} project matches</strong>
        {results.map((result) => <button key={result.id} disabled={disabled || result.id === id} onClick={() => choose(result.id)}><span>{result.name}</span><small>{result.match}</small></button>)}
        {!results.length && <p>No matching IDs, labels, metadata, or paths.</p>}
      </div>}
      <form onSubmit={createFolder}>
        <label className="field">New folder<input value={folderName} list="workspace-folders" placeholder="Diagrams/Services" onChange={(event) => setFolderName(event.target.value)} /></label>
        <button disabled={disabled || loading || !folderName}>Create folder</button>
      </form>
      {id && <form onSubmit={move}>
        <label className="field">Rename or move current file<input value={moveName} list="workspace-folders" onChange={(event) => setMoveName(event.target.value)} /></label>
        <button disabled={disabled || loading || !moveName || moveName === files.find((file) => file.id === id)?.name}>Move file</button>
      </form>}
      <datalist id="workspace-folders">{folders.map((folder) => <option key={folder} value={`${folder}/`} />)}</datalist>
      <details>
        <summary>Shared project defaults</summary>
        <p>Opt-in versioned defaults live in <code>.archify-editor.json</code>. Diagram JSON and machine-only history remain separate.</p>
        {sharedPreferences ? <button disabled={disabled} onClick={() => onApplyProjectPreferences(sharedPreferences)}>Apply project defaults</button> : <p>No shared project defaults.</p>}
        <button disabled={disabled || loading} onClick={saveProjectPreferences}>Save current canvas defaults to project</button>
      </details>
      <button disabled={disabled || loading} onClick={refresh}>Refresh files</button>
      {pendingCount > 0 && <p>{pendingCount} other file drafts have unsaved changes.</p>}
      {skipped > 0 && <p>{skipped} malformed or oversized JSON files were skipped.</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
