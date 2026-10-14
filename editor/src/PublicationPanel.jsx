import React, { useEffect, useRef, useState } from "react";
import { newPublication, publicationText, publicationNodes, removePublicationDiagram, movePublicationDiagram, setPublicationLink, publicationSourcesClean } from "./publication-authoring.mjs";

export default function PublicationPanel({ visible, session, drafts, disabled, onOpenDiagram, onClose }) {
  const [files, setFiles] = useState([]), [manifest, setManifest] = useState(null),
    [saved, setSaved] = useState(null), [name, setName] = useState("publication.json"),
    [newName, setNewName] = useState("publication.json"), [openId, setOpenId] = useState(""),
    [sourceId, setSourceId] = useState(""), [entryId, setEntryId] = useState("diagram1"),
    [diagrams, setDiagrams] = useState([]), [selected, setSelected] = useState(""),
    [component, setComponent] = useState(""), [busy, setBusy] = useState(false),
    [error, setError] = useState(""), [notice, setNotice] = useState(""), [preview, setPreview] = useState(null), [previewUrl, setPreviewUrl] = useState(null);
  const generation = useRef(0), current = useRef(null), dialog = useRef(null);
  const available = session?.workspace && !session?.offline;
  const text = manifest ? publicationText(manifest) : "";
  const dirty = !!manifest && text !== (saved ? publicationText(saved.manifest) : "");
  const cleanSources = publicationSourcesClean(diagrams, drafts);
  current.current = { text, dirty, cleanSources };
  const selectedEntry = manifest?.diagrams.find((entry) => entry.id === selected);
  const selectedDocument = diagrams.find((entry) => entry.id === selected)?.document;
  const nodes = publicationNodes(selectedDocument);
  const link = manifest?.links.find((item) => item.from.diagram === selected && item.from.component === component);
  const folder = (manifest ? name : newName).replaceAll("\\", "/").replace(/[^/]*$/, "");
  const sources = files.filter((file) => file.type !== "publication" && file.type !== "unsupported" && file.name.startsWith(folder));

  async function request(url, body) {
    const response = await fetch(url, {
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      headers: { "Content-Type": "application/json", "X-Editor-Token": session.token },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  }
  async function act(action) {
    setBusy(true); setError("");
    try { await action(); } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }
  async function refresh() {
    const data = await request("/api/workspace");
    setFiles(data.files);
  }
  useEffect(() => { if (visible && available) void act(refresh); }, [visible, available]);
  useEffect(() => {
    if (visible && !dialog.current.open) dialog.current.showModal();
    else if (!visible && dialog.current.open) dialog.current.close();
  }, [visible]);
  useEffect(() => {
    const before = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  useEffect(() => { generation.current++; setPreview(null); }, [text, cleanSources]);
  useEffect(() => {
    const url = preview ? URL.createObjectURL(new Blob([preview], { type: "text/html" })) : null;
    setPreviewUrl(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [preview]);
  function change(next) {
    generation.current++; setManifest(next); setPreview(null); setNotice("");
  }
  function apply(data) {
    generation.current++;
    setManifest(data.manifest); setSaved(data); setDiagrams(data.diagrams);
    setName(data.name); setSelected(data.manifest.diagrams[0].id); setComponent(""); setPreview(null);
  }
  function canReplace() {
    return !dirty || window.confirm("Discard unsaved publication changes? Diagram drafts will be retained.");
  }
  async function open() {
    if (!canReplace()) return;
    await act(async () => { apply(await request(`/api/publication?id=${encodeURIComponent(openId)}`)); setNotice("Publication opened. Diagram files are unchanged."); });
  }
  async function readSource(id, publicationId) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(publicationId)) throw new Error("Use a diagram ID starting with a letter, followed by letters, numbers, _ or -.");
    const file = files.find((entry) => entry.id === id);
    if (!file || !file.name.startsWith(folder)) throw new Error("Choose a diagram within the manifest folder.");
    const data = await request(`/api/document?id=${encodeURIComponent(id)}`);
    const document = data.rawOnly ? JSON.parse(data.sourceText) : data.document;
    if (!document?.diagram_type) throw new Error(data.limitation || "Choose a diagram JSON file.");
    return { id: publicationId, label: document.meta?.title || publicationId, source: file.name.slice(folder.length), document, workspaceId: id, revision: data.revision };
  }
  async function create() {
    if (!canReplace()) return;
    await act(async () => {
      const entry = await readSource(sourceId, entryId);
      const { document, workspaceId, revision, ...definition } = entry;
      setName(newName.replaceAll("\\", "/")); setSaved(null); setDiagrams([entry]); setSelected(entry.id); setComponent("");
      change(newPublication(definition)); setNotice("New publication draft. Save explicitly to create the manifest.");
    });
  }
  async function add() {
    await act(async () => {
      const entry = await readSource(sourceId, entryId);
      if (manifest.diagrams.some((item) => item.id === entry.id || item.source === entry.source))
        throw new Error("Diagram IDs and source files must be unique.");
      const { document, workspaceId, revision, ...definition } = entry;
      setDiagrams([...diagrams, entry]); setSelected(entry.id); setComponent("");
      change({ ...manifest, diagrams: [...manifest.diagrams, definition] });
    });
  }
  async function save() {
    const snapshot = manifest, version = generation.current;
    await act(async () => {
      const data = await request("/api/publication/save", { name, manifest: snapshot, revision: saved?.revision ?? null });
      setSaved(data);
      if (generation.current === version) {
        setManifest(data.manifest); setDiagrams(data.diagrams);
      }
      await refresh(); setNotice("Manifest saved. Referenced diagram files were not overwritten.");
    });
  }
  async function render() {
    const version = generation.current, snapshot = current.current;
    await act(async () => {
      if (!saved || snapshot.dirty || !snapshot.cleanSources) throw new Error("Save the publication and every referenced diagram draft before rendering.");
      const data = await request("/api/publication/render", {
        id: saved.id, revision: saved.revision,
        sourceRevisions: Object.fromEntries(saved.diagrams.map((entry) => [entry.id, entry.revision])),
      });
      if (generation.current !== version || current.current.text !== snapshot.text || !current.current.cleanSources)
        throw new Error("Publication render discarded because a draft changed. Save and render again.");
      setPreview(data.html); setNotice(`Published ${data.diagramCount} diagrams and ${data.linkCount} links to ${data.output}.`);
    });
  }
  function patchEntry(patch) {
    change({ ...manifest, diagrams: manifest.diagrams.map((entry) => entry.id === selected ? { ...entry, ...patch } : entry) });
  }

  return <dialog ref={dialog} className="publication-panel" aria-label="Publication authoring" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="publication-heading"><h2>Linked publication</h2><button onClick={onClose}>Close publication panel</button></div>
    {!available ? <p role="status">{session?.offline ? "Publication authoring is unavailable in the browser-only offline edition: referenced disk JSON files cannot be loaded. Use the local or desktop editor with --directory." : "Start the local editor with --directory to open or create a publication. Standalone diagram editing is unchanged."}</p> : <>
      <p>Diagrams remain separate JSON files. Links are optional, with one target per source component; no hierarchy is required.</p>
      <label className="field">Open publication<select value={openId} disabled={busy} onChange={(event) => setOpenId(event.target.value)}>
        <option value="">Choose a manifest</option>
        {files.filter((file) => file.type === "publication").map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}
      </select></label>
      <button disabled={busy || !openId} onClick={open}>Open publication</button>
      <button disabled={busy} onClick={() => act(refresh)}>Refresh publication files</button>
      {!manifest && <label className="field">New manifest filename<input value={newName} onChange={(event) => setNewName(event.target.value)} /></label>}
      <label className="field">Diagram ID<input value={entryId} disabled={busy} onChange={(event) => setEntryId(event.target.value)} /></label>
      <label className="field">Diagram source<select value={sourceId} disabled={busy} onChange={(event) => setSourceId(event.target.value)}>
        <option value="">Choose a JSON diagram</option>
        {sources.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}
      </select></label>
      {manifest ? <button disabled={busy || !sourceId} onClick={add}>Add publication diagram</button> : <button disabled={busy || !sourceId} onClick={create}>Create publication draft</button>}
      {manifest && <>
        <p><strong>{name}</strong> — {dirty ? "Unsaved publication changes" : "Saved publication"}</p>
        <label className="field">Publication title<input value={manifest.title} onChange={(event) => change({ ...manifest, title: event.target.value })} /></label>
        <label className="field">Publication output<input value={manifest.output} onChange={(event) => change({ ...manifest, output: event.target.value })} /></label>
        <label className="field">Initial diagram<select value={manifest.initial_diagram} onChange={(event) => change({ ...manifest, initial_diagram: event.target.value })}>
          {manifest.diagrams.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
        </select></label>
        <ol className="publication-diagrams">{manifest.diagrams.map((entry, index) => <li key={entry.id}>
          <button aria-pressed={selected === entry.id} onClick={() => { setSelected(entry.id); setComponent(""); }}>{entry.label} ({entry.id})</button>
          <small>{entry.source}</small>
          <button aria-label={`Move ${entry.id} up`} disabled={index === 0} onClick={() => change(movePublicationDiagram(manifest, entry.id, -1))}>↑</button>
          <button aria-label={`Move ${entry.id} down`} disabled={index === manifest.diagrams.length - 1} onClick={() => change(movePublicationDiagram(manifest, entry.id, 1))}>↓</button>
          <button aria-label={`Remove ${entry.id}`} disabled={manifest.diagrams.length === 1} onClick={() => {
            if (!window.confirm(`Remove ${entry.label} from the publication and remove its links? The JSON file will not be deleted.`)) return;
            const next = removePublicationDiagram(manifest, entry.id); change(next);
            setDiagrams(diagrams.filter((item) => item.id !== entry.id));
            if (selected === entry.id) { setSelected(next.diagrams[0].id); setComponent(""); }
          }}>Remove</button>
          <button disabled={disabled || busy} onClick={async () => {
            const source = diagrams.find((item) => item.id === entry.id);
            if (source) { await onOpenDiagram(source.workspaceId); onClose(); }
          }}>Edit diagram</button>
        </li>)}</ol>
        {selectedEntry && <fieldset><legend>Diagram {selectedEntry.id}</legend>
          <label className="field">Diagram label<input value={selectedEntry.label} onChange={(event) => patchEntry({ label: event.target.value })} /></label>
          <label className="field">Optional C4 level<input value={selectedEntry.c4_level || ""} placeholder="context, container, component, code" onChange={(event) => {
            const next = { ...selectedEntry };
            if (event.target.value) next.c4_level = event.target.value; else delete next.c4_level;
            change({ ...manifest, diagrams: manifest.diagrams.map((entry) => entry.id === selected ? next : entry) });
          }} /></label>
          <label className="field">Source component<select value={component} onChange={(event) => setComponent(event.target.value)}>
            <option value="">Choose a component</option>
            {nodes.map((node) => <option key={node.id} value={node.id}>{node.label} ({node.id})</option>)}
          </select></label>
          <label className="field">Target diagram<select value={link?.to.diagram || ""} disabled={!component} onChange={(event) => change(setPublicationLink(manifest, selected, component, event.target.value))}>
            <option value="">No link</option>
            {manifest.diagrams.map((entry) => <option key={entry.id} value={entry.id}>{entry.label} ({entry.id})</option>)}
          </select></label>
        </fieldset>}
        <p>{manifest.links.length} component links. {!cleanSources && "Referenced diagrams have unsaved drafts; save them before rendering."}</p>
        <button disabled={busy || !dirty} onClick={save}>Save publication</button>
        <button onClick={() => {
          const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
          const anchor = document.createElement("a");
          anchor.href = url; anchor.download = name.split("/").pop(); anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setNotice("Publication draft downloaded. This does not confirm a disk save.");
        }}>Download publication JSON</button>
        <button disabled={busy || dirty || !saved || !cleanSources || disabled} onClick={render}>Render publication</button>
        <button disabled={busy || !saved} onClick={() => {
          if (canReplace()) void act(async () => { apply(await request(`/api/publication?id=${encodeURIComponent(saved.id)}`)); setNotice("Publication and source revisions refreshed."); });
        }}>Reload publication</button>
        <button disabled={busy} onClick={() => {
          if (!canReplace()) return;
          setManifest(null); setSaved(null); setDiagrams([]); setPreview(null); setNewName("publication.json");
        }}>New publication</button>
      </>}
    </>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {previewUrl && <>
      <h3>Session-only publication preview</h3>
      <p id="publication-preview-guidance">This preview uses a temporary Blob URL, not the saved publication address. Copy link inside this preview is not shareable, and the reader's Copy reading link is unavailable here. For durable reading links, open the saved HTML output locally or host it at a stable HTTP(S) URL, then copy links from that exported publication. Local file links require access to the same file; use HTTP(S) hosting to share with others.</p>
      <iframe title="Publication preview" aria-describedby="publication-preview-guidance" sandbox="allow-scripts allow-downloads" src={previewUrl} />
    </>}
  </dialog>;
}
