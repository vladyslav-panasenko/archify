import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  BaseEdge,
  getSmoothStepPath,
  getStraightPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  assertDocument,
  components,
  serialize,
  moveComponents,
  patchComponent,
  patchConnection,
  history,
  commit,
  undo,
  redo,
  layoutWarnings,
} from "./document.mjs";
import "./style.css";

const sides = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};
const kinds = {
  frontend: "UI",
  backend: "API",
  database: "DB",
  cloud: "CL",
  security: "ID",
  messagebus: "MQ",
  external: "EX",
};

function ComponentNode({ data, selected }) {
  return (
    <div className={`component kind-${data.type} ${selected ? "chosen" : ""}`}>
      {Object.entries(sides).map(([side, position]) => (
        <React.Fragment key={side}>
          <Handle
            id={`source-${side}`}
            type="source"
            position={position}
            isConnectable={false}
          />
          <Handle
            id={`target-${side}`}
            type="target"
            position={position}
            isConnectable={false}
          />
        </React.Fragment>
      ))}
      <span className="kind-icon" aria-hidden="true">
        {kinds[data.type] || "•"}
      </span>
      <div className="node-copy">
        <strong>{data.label}</strong>
        {data.sublabel && <span>{data.sublabel}</span>}
      </div>
    </div>
  );
}
function BoundaryNode({ data }) {
  return (
    <div className="boundary">
      <span>{data.label}</span>
    </div>
  );
}
function ConnectionEdge(props) {
  const { data, sourceX, sourceY, targetX, targetY } = props;
  let result =
    data.route === "straight"
      ? getStraightPath(props)
      : getSmoothStepPath({ ...props, borderRadius: 4 });
  if (data.via?.length) {
    const points = [[sourceX, sourceY], ...data.via, [targetX, targetY]];
    result = [
      points.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" "),
      ...points[Math.floor(points.length / 2)],
    ];
  }
  const point = data.labelAt || [
    result[1] + (data.labelDx || 0),
    result[2] + (data.labelDy || 0),
  ];
  return (
    <BaseEdge
      id={props.id}
      path={result[0]}
      markerEnd={props.markerEnd}
      style={{
        stroke: props.selected ? "#087b72" : "#82929c",
        strokeWidth: props.selected ? 2.5 : 1.5,
        strokeDasharray: data.variant === "dashed" ? "5 4" : undefined,
      }}
      label={data.label}
      labelX={point[0]}
      labelY={point[1]}
      labelStyle={{ fill: "#3d4d57", fontSize: 10 }}
      labelBgStyle={{ fill: "#f8fafb", fillOpacity: 0.96 }}
      labelBgPadding={[5, 3]}
    />
  );
}
const nodeTypes = { component: ComponentNode, boundary: BoundaryNode },
  edgeTypes = { connection: ConnectionEdge };

function Field({ label, value, onCommit, number = false }) {
  const [text, setText] = useState(String(value ?? ""));
  useEffect(() => setText(String(value ?? "")), [value]);
  const save = () => {
    if (text === String(value ?? "")) return;
    if (number && (!text.trim() || !Number.isFinite(Number(text)))) {
      setText(String(value ?? ""));
      return;
    }
    onCommit(number ? Number(text) : text);
  };
  return (
    <label className="field">
      {label}
      <input
        type={number ? "number" : "text"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setText(String(value ?? ""));
            e.stopPropagation();
          }
        }}
      />
    </label>
  );
}
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App() {
  const [state, setState] = useState(null),
    [draft, setDraft] = useState(null);
  // React Flow measurements are presentation state, never diagram JSON. Keep
  // them across coordinate updates or React Flow hides and remeasures each node.
  const [measurements, setMeasurements] = useState({});
  const [session, setSession] = useState(null),
    [saved, setSaved] = useState("");
  const [selection, setSelection] = useState([]),
    [edgeIndex, setEdgeIndex] = useState(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("Opening diagram…"),
    [busy, setBusy] = useState(false);
  const [snap, setSnap] = useState(false),
    [panel, setPanel] = useState("inspector"),
    [query, setQuery] = useState("");
  const [jsonText, setJsonText] = useState(""),
    [html, setHtml] = useState(null);
  const flow = useRef(),
    picker = useRef(),
    dragBase = useRef(),
    cancelled = useRef(false),
    dialog = useRef();
  const documentModel = draft || state?.present;
  const dirty = Boolean(state && serialize(state.present) !== saved);
  const rawDirty = Boolean(
    state && panel === "json" && jsonText !== serialize(state.present),
  );
  const hasUnsaved = dirty || rawDirty || Boolean(draft);

  useEffect(() => {
    fetch("/api/document")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        load(data);
      })
      .catch((e) => {
        setError(e.message);
        setNotice("Could not open diagram.");
      });
  }, []);
  useEffect(() => {
    const before = (e) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [hasUnsaved]);
  useEffect(() => {
    if (state) setJsonText(serialize(state.present));
    setHtml(null);
  }, [state]);
  useEffect(() => {
    if (html) dialog.current?.showModal();
  }, [html]);
  // Pointer dragging may leave focus on the document body. Capture shortcuts at
  // the window so cancelling does not depend on React Flow's focus ownership.
  useEffect(() => {
    const cancel = () => {
      if (dragBase.current) {
        cancelled.current = true;
        dragBase.current = null;
        setDraft(null);
      }
    };
    window.addEventListener("keydown", onKeys, true);
    window.addEventListener("blur", cancel);
    window.addEventListener("pointercancel", cancel, true);
    return () => {
      window.removeEventListener("keydown", onKeys, true);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("pointercancel", cancel, true);
    };
  });

  function load(data) {
    setMeasurements({});
    assertDocument(data.document);
    setState(history(data.document));
    setDraft(null);
    setSession(data);
    setSaved(serialize(data.document));
    setSelection([]);
    setEdgeIndex(null);
    setError("");
    setNotice(
      data.writable
        ? "Local file opened."
        : "Sample opened. Import a JSON file to begin.",
    );
    setTimeout(() => flow.current?.fitView({ padding: 0.15 }), 100);
  }
  function change(next) {
    if (rawDirty) {
      setError(
        "Apply or discard the JSON text changes before editing the canvas.",
      );
      return;
    }
    setState((previous) => commit(previous, next));
    setDraft(null);
    setError("");
    setNotice("Layout updated.");
  }
  async function request(endpoint, document, method = "POST") {
    const response = await fetch(`/api/${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Editor-Token": session.token,
      },
      body: JSON.stringify({ document, revision: session.revision }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error);
    }
    return response;
  }
  async function act(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveJson(direct = false) {
    if (rawDirty) {
      setError("Apply or discard the JSON text changes before saving.");
      return;
    }
    await act(async () => {
      const snapshot = state.present;
      if (direct) {
        const data = await (await request("document", snapshot, "PUT")).json();
        setSession((s) => ({ ...s, revision: data.revision }));
      } else {
        await request("validate", snapshot);
        download(serialize(snapshot), session.name, "application/json");
      }
      // Downloads cannot confirm a disk write; keep dirty state for a directly opened file.
      if (direct || !session.writable) setSaved(serialize(snapshot));
      setNotice(
        direct ? "JSON saved to the opened file." : "JSON download prepared.",
      );
    });
  }
  async function importFile(file) {
    if (!file) return;
    if (
      hasUnsaved &&
      !window.confirm("Discard unsaved changes and open another JSON file?")
    )
      return;
    await act(async () => {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("JSON exceeds the 5 MB limit.");
      const document = JSON.parse(await file.text());
      assertDocument(document);
      await request("validate", document);
      load({ ...session, document, name: file.name, writable: false });
      setNotice("JSON imported. Changes can be downloaded.");
    });
  }
  function applyPatch(patch) {
    try {
      change(patchComponent(state.present, selection[0], patch));
    } catch (e) {
      setError(e.message);
    }
  }
  function edgePatch(patch) {
    try {
      change(patchConnection(state.present, edgeIndex, patch));
    } catch (e) {
      setError(e.message);
    }
  }
  function pointField(key, text, multiple = false) {
    try {
      if (!text.trim()) return edgePatch({ [key]: undefined });
      const value = JSON.parse(text),
        points = multiple ? value : [value];
      if (
        !Array.isArray(points) ||
        !points.every(
          (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite),
        )
      )
        throw new Error(
          "Use [x, y] coordinates, or [[x, y], …] for waypoints.",
        );
      edgePatch({ [key]: value });
    } catch (e) {
      setError(e.message);
    }
  }

  const items = documentModel ? components(documentModel) : [];
  const nodes = useMemo(() => {
    if (!documentModel) return [];
    const cs = components(documentModel),
      byId = new Map(cs.map((c) => [c.id, c]));
    const boundaries = (documentModel.boundaries || []).map((b, index) => {
      const members = b.wraps.map((id) => byId.get(id)).filter(Boolean),
        pad = b.pad ?? 30;
      const x = Math.min(...members.map((c) => c.pos[0])) - pad,
        y = Math.min(...members.map((c) => c.pos[1])) - pad;
      return {
        id: `b:${index}`,
        measured: measurements[`b:${index}`],
        type: "boundary",
        position: { x, y },
        data: b,
        style: {
          width:
            Math.max(...members.map((c) => c.pos[0] + c.size[0])) + pad - x,
          height:
            Math.max(...members.map((c) => c.pos[1] + c.size[1])) +
            pad +
            20 -
            y,
        },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: -1,
      };
    });
    return [
      ...boundaries,
      ...cs.map((c) => ({
        id: `c:${c.id}`,
        measured: measurements[`c:${c.id}`],
        type: "component",
        position: { x: c.pos[0], y: c.pos[1] },
        data: c,
        selected: selection.includes(c.id),
        style: { width: c.size[0], height: c.size[1] },
        ariaLabel: `${c.label}, ${c.type}`,
      })),
    ];
  }, [documentModel, selection, measurements]);
  const edges = useMemo(
    () =>
      (documentModel?.connections || []).map((e, index) => ({
        id: `e:${index}`,
        source: `c:${e.from}`,
        target: `c:${e.to}`,
        sourceHandle: `source-${e.fromSide || "right"}`,
        targetHandle: `target-${e.toSide || "left"}`,
        data: e,
        type: "connection",
        selected: index === edgeIndex,
        markerEnd: { type: "arrowclosed", color: "#82929c" },
      })),
    [documentModel, edgeIndex],
  );
  const warnings = documentModel ? layoutWarnings(documentModel) : [];
  const selected = items.find((c) => c.id === selection[0]),
    edge = documentModel?.connections?.[edgeIndex];

  function onKeys(event) {
    if (dialog.current?.open) return;
    const editingText = event.target.closest(
      "input,textarea,select,[contenteditable]",
    );
    if (event.key === "Escape" && dragBase.current) {
      cancelled.current = true;
      setDraft(null);
      dragBase.current = null;
      event.stopPropagation();
      return;
    }
    if (editingText || busy || rawDirty || !state) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void saveJson(session.writable);
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      ["z", "y"].includes(event.key.toLowerCase())
    ) {
      event.preventDefault();
      setState((s) =>
        event.shiftKey || event.key.toLowerCase() === "y" ? redo(s) : undo(s),
      );
    }
    const delta = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (delta && selection.length) {
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 10 : 1;
      change(
        moveComponents(
          state.present,
          new Map(
            items
              .filter((c) => selection.includes(c.id))
              .map((c) => [
                c.id,
                [c.pos[0] + delta[0] * step, c.pos[1] + delta[1] * step],
              ]),
          ),
        ),
      );
    }
  }

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <strong>
            Archify <span>Editor</span>
          </strong>
        </div>
        <div className="file-name">
          {session?.name || "No document"}
          <span className={hasUnsaved ? "dirty" : "saved"}>
            {hasUnsaved
              ? "Unsaved changes"
              : session
                ? "Saved state"
                : "Loading"}
          </span>
        </div>
        <nav aria-label="Document actions">
          <button
            disabled={!session || busy}
            onClick={() => picker.current.click()}
          >
            Open JSON
          </button>
          <button
            disabled={!state?.past.length || busy || rawDirty || !!draft}
            onClick={() => setState(undo)}
          >
            Undo
          </button>
          <button
            disabled={!state?.future.length || busy || rawDirty || !!draft}
            onClick={() => setState(redo)}
          >
            Redo
          </button>
          <button
            disabled={!state || busy || rawDirty || !!draft}
            onClick={() => saveJson(false)}
          >
            Download JSON
          </button>
          {session?.writable && (
            <button
              className="primary"
              disabled={busy || rawDirty || !!draft || !dirty}
              onClick={() => saveJson(true)}
            >
              Save file
            </button>
          )}
          <button
            className="render-button"
            disabled={!state || busy || rawDirty || !!draft}
            onClick={() =>
              act(async () => {
                const result = await request("render", state.present);
                setHtml(await result.text());
                setNotice("Archify rendered the current JSON.");
              })
            }
          >
            {busy ? "Working…" : "Render HTML"}
          </button>
        </nav>
        <input
          ref={picker}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            void importFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </header>
      <div className="workspace">
        <aside className="outline" aria-label="Components">
          <div className="section-heading">
            <h2>Components</h2>
            <span>{items.length}</span>
          </div>
          <input
            className="search"
            aria-label="Find component"
            placeholder="Find a component…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="component-list">
            {items
              .filter((c) =>
                `${c.label} ${c.id}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.id}
                  className={selection.includes(c.id) ? "active" : ""}
                  onClick={() => {
                    setSelection([c.id]);
                    setEdgeIndex(null);
                  }}
                >
                  <span className={`list-icon kind-${c.type}`}>
                    {kinds[c.type]}
                  </span>
                  <span>
                    <strong>{c.label}</strong>
                    <small>{c.id}</small>
                  </span>
                </button>
              ))}
          </div>
          <div className="outline-foot">
            Architecture diagram
            <br />
            <span>
              {documentModel?.connections?.length || 0} connections ·{" "}
              {documentModel?.boundaries?.length || 0} boundaries
            </span>
          </div>
        </aside>
        <main className="canvas" aria-label="Diagram canvas">
          <div className="canvas-heading">
            <div>
              <h1>{documentModel?.meta?.title || "Archify diagram"}</h1>
              <p>Arrange the diagram. Save the JSON.</p>
            </div>
            <label className="snap">
              <input
                type="checkbox"
                checked={snap}
                onChange={(e) => setSnap(e.target.checked)}
              />
              Snap to grid
            </label>
          </div>
          {state && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={(instance) => {
                flow.current = instance;
              }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.15}
              maxZoom={3}
              snapToGrid={snap}
              snapGrid={[10, 10]}
              nodesConnectable={false}
              deleteKeyCode={null}
              nodesDraggable={!busy && !rawDirty}
              elementsSelectable={!busy}
              selectionOnDrag
              panOnDrag={[1, 2]}
              panActivationKeyCode="Space"
              selectionKeyCode="Shift"
              multiSelectionKeyCode="Shift"
              onlyRenderVisibleElements={false}
              onNodesChange={(changes) => {
                const dimensions = changes.filter(c => c.type === "dimensions" && c.dimensions);
                if (dimensions.length) setMeasurements(previous => {
                  let next = previous;
                  for (const { id, dimensions: measured } of dimensions) {
                    if (previous[id]?.width === measured.width && previous[id]?.height === measured.height) continue;
                    if (next === previous) next = { ...previous };
                    next[id] = measured;
                  }
                  return next;
                });
                const selections = changes.filter(
                  (c) => c.type === "select" && c.id.startsWith("c:"),
                );
                if (selections.length)
                  setSelection((previous) => {
                    const ids = new Set(previous);
                    selections.forEach((c) =>
                      c.selected
                        ? ids.add(c.id.slice(2))
                        : ids.delete(c.id.slice(2)),
                    );
                    return [...ids];
                  });
                const positions = changes.filter(
                  (c) =>
                    c.type === "position" &&
                    c.position &&
                    c.id.startsWith("c:"),
                );
                if (positions.length && dragBase.current && !cancelled.current)
                  setDraft((previous) =>
                    moveComponents(
                      previous || dragBase.current,
                      new Map(
                        positions.map((c) => [
                          c.id.slice(2),
                          [c.position.x, c.position.y],
                        ]),
                      ),
                    ),
                  );
              }}
              onNodeClick={(_, node) => {
                if (node.id.startsWith("c:")) setEdgeIndex(null);
              }}
              onEdgeClick={(_, e) => {
                setEdgeIndex(Number(e.id.slice(2)));
                setSelection([]);
              }}
              onPaneClick={() => {
                setSelection([]);
                setEdgeIndex(null);
              }}
              onNodeDragStart={() => {
                dragBase.current = state.present;
                cancelled.current = false;
              }}
              onNodeDragStop={(_, node, draggedNodes) => {
                if (!cancelled.current && dragBase.current)
                  change(
                    moveComponents(
                      dragBase.current,
                      new Map(
                        (draggedNodes?.length ? draggedNodes : [node])
                          .filter((n) => n.id.startsWith("c:"))
                          .map((n) => [
                            n.id.slice(2),
                            [n.position.x, n.position.y],
                          ]),
                      ),
                    ),
                  );
                dragBase.current = null;
                setDraft(null);
              }}
            >
              <Background gap={20} size={1} color="#cdd7dc" />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
          <div className="canvas-help">
            Drag to move · Shift to select several · Space + drag to pan · Arrow
            keys to nudge
          </div>
        </main>
        <aside className="inspector" aria-label="Document inspector">
          <div className="tabs">
            <button
              className={panel === "inspector" ? "active" : ""}
              onClick={() => {
                if (
                  !rawDirty ||
                  window.confirm("Discard unapplied JSON text changes?")
                ) {
                  setJsonText(state ? serialize(state.present) : "");
                  setPanel("inspector");
                }
              }}
            >
              Properties
            </button>
            <button
              className={panel === "json" ? "active" : ""}
              onClick={() => setPanel("json")}
            >
              JSON
            </button>
          </div>
          {panel === "json" ? (
            <div className="json-panel">
              <p>Edit the source, then apply it to the canvas.</p>
              <textarea
                aria-label="Diagram JSON"
                spellCheck="false"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
              <div className="button-row">
                <button
                  disabled={!rawDirty || busy}
                  onClick={() => setJsonText(serialize(state.present))}
                >
                  Discard text
                </button>
                <button
                  className="primary"
                  disabled={!rawDirty || busy}
                  onClick={() =>
                    act(async () => {
                      const next = JSON.parse(jsonText);
                      assertDocument(next);
                      await request("validate", next);
                      setState((s) => commit(s, next));
                      setJsonText(serialize(next));
                      setSelection([]);
                      setEdgeIndex(null);
                      setNotice("JSON applied.");
                    })
                  }
                >
                  Apply JSON
                </button>
              </div>
            </div>
          ) : (
            <div className="properties">
              {selected ? (
                <>
                  <div className="selected-heading">
                    <span className="eyebrow">
                      {selection.length > 1
                        ? `${selection.length} selected · editing first`
                        : selected.type}
                    </span>
                    <h2>{selected.label}</h2>
                    <code>{selected.id}</code>
                  </div>
                  <fieldset disabled={busy || !!draft}>
                    <legend>Component</legend>
                    <Field
                      label="Label"
                      value={selected.label}
                      onCommit={(label) =>
                        label.trim()
                          ? applyPatch({ label })
                          : setError("A label cannot be empty.")
                      }
                    />
                    <Field
                      label="Sublabel"
                      value={selected.sublabel}
                      onCommit={(sublabel) => applyPatch({ sublabel })}
                    />
                    <div className="field-grid">
                      <Field
                        label="X"
                        value={selected.pos[0]}
                        number
                        onCommit={(x) =>
                          applyPatch({ pos: [x, selected.pos[1]] })
                        }
                      />
                      <Field
                        label="Y"
                        value={selected.pos[1]}
                        number
                        onCommit={(y) =>
                          applyPatch({ pos: [selected.pos[0], y] })
                        }
                      />
                      <Field
                        label="Width"
                        value={selected.size[0]}
                        number
                        onCommit={(w) =>
                          applyPatch({ size: [w, selected.size[1]] })
                        }
                      />
                      <Field
                        label="Height"
                        value={selected.size[1]}
                        number
                        onCommit={(h) =>
                          applyPatch({ size: [selected.size[0], h] })
                        }
                      />
                    </div>
                    {documentModel.layout &&
                      Number.isInteger(selected.row) &&
                      Number.isInteger(selected.col) && (
                        <button onClick={() => applyPatch({ pos: undefined })}>
                          Reset to grid position
                        </button>
                      )}
                  </fieldset>
                  <p className="muted">
                    Moving this component keeps its connections and boundary
                    membership.
                  </p>
                </>
              ) : edge ? (
                <>
                  <div className="selected-heading">
                    <span className="eyebrow">Connection</span>
                    <h2>
                      {edge.from} → {edge.to}
                    </h2>
                    <code>{edge.id || `Connection ${edgeIndex + 1}`}</code>
                  </div>
                  <fieldset disabled={busy}>
                    <legend>Routing</legend>
                    <Field
                      label="Label"
                      value={edge.label}
                      onCommit={(label) => edgePatch({ label })}
                    />
                    {["fromSide", "toSide"].map((key) => (
                      <label className="field" key={key}>
                        {key === "fromSide" ? "Source side" : "Target side"}
                        <select
                          value={edge[key] || ""}
                          onChange={(e) =>
                            edgePatch({ [key]: e.target.value || undefined })
                          }
                        >
                          <option value="">Automatic</option>
                          {Object.keys(sides).map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <label className="field">
                      Route
                      <select
                        value={edge.route || "auto"}
                        onChange={(e) => edgePatch({ route: e.target.value })}
                      >
                        {[
                          "auto",
                          "straight",
                          "orthogonal-h",
                          "orthogonal-v",
                        ].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Waypoints · [[x, y], …]"
                      value={edge.via ? JSON.stringify(edge.via) : ""}
                      onCommit={(value) => pointField("via", value, true)}
                    />
                    <Field
                      label="Label position · [x, y]"
                      value={edge.labelAt ? JSON.stringify(edge.labelAt) : ""}
                      onCommit={(value) => pointField("labelAt", value)}
                    />
                    <p className="muted">
                      Blank coordinates restore automatic placement. Archify
                      computes the final route when rendering.
                    </p>
                  </fieldset>
                </>
              ) : (
                <div className="empty-selection">
                  <span className="selection-symbol" aria-hidden="true">
                    ↖
                  </span>
                  <h2>Select an item</h2>
                  <p>
                    Choose a component to adjust its position and size, or a
                    connection to refine its route.
                  </p>
                  <dl>
                    <dt>Move precisely</dt>
                    <dd>Arrow keys · Shift for 10 units</dd>
                    <dt>Final appearance</dt>
                    <dd>Use Render HTML to see Archify’s output.</dd>
                  </dl>
                </div>
              )}
              <div className="diagnostics">
                <h3>
                  Layout notes {warnings.length ? `(${warnings.length})` : ""}
                </h3>
                {warnings.length ? (
                  <ul>
                    {warnings.slice(0, 20).map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No component overlaps detected.</p>
                )}
                <p className="muted">
                  Draft checks only. Archify validates routes and labels when
                  rendering.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          <pre>{error}</pre>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
      <footer className="status" role="status">
        <span>{notice}</span>
        <span>
          {session?.writable
            ? "Direct file saving enabled"
            : "Local editor · JSON downloads"}{" "}
          · {hasUnsaved ? "Unsaved" : "Ready"}
        </span>
      </footer>
      <dialog
        ref={dialog}
        className="preview"
        onCancel={() => setHtml(null)}
        onClose={() => setHtml(null)}
      >
        <div className="preview-toolbar">
          <h2>Archify output</h2>
          <button
            onClick={() =>
              download(
                html,
                session.name.replace(/\.json$/i, "") + ".html",
                "text/html",
              )
            }
          >
            Download HTML
          </button>
          <button
            onClick={() => {
              dialog.current.close();
              setHtml(null);
            }}
          >
            Close preview
          </button>
        </div>
        {html && (
          <iframe
            title="Archify rendered diagram"
            sandbox="allow-scripts"
            srcDoc={html}
          />
        )}
      </dialog>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
