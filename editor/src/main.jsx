import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  ReactFlow,
  Background,
  Controls,
  ViewportPortal,
  NodeResizer,
  EdgeLabelRenderer,
  useReactFlow,
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
  newDocument,
  addComponent,
  addConnection,
  removeComponent,
  removeConnection,
  reconnectConnection,
} from "./document.mjs";
import "./style.css";
import AutoLayoutPanel from "./AutoLayoutPanel.jsx";
import TemplatesPanel from "./TemplatesPanel.jsx";
const JsonEditor = React.lazy(() => import("./JsonEditor.jsx"));
import {
  adapterFor,
  editingOptions,
  connections,
  sourceNodes,
  nodeKey,
  edgeKey,
} from "./adapters/index.mjs";
import { messageRange } from "./adapters/sequence.mjs";
import { automaticLabelPoint } from "./label-placement.mjs";
import {
  arrange,
  arrangements,
  snapPositions,
  snapResize,
} from "./arrangement.mjs";
import { copySelection, pasteSelection } from "./clipboard.mjs";
import {
  commonValue,
  bulkPatch,
  deletionSummary,
  removeSelection,
  resetFields,
} from "./selection.mjs";
import StructurePanel from "./StructurePanel.jsx";
import { createDiagram, authoringTypes } from "./topology.mjs";
import SettingsPanel from "./SettingsPanel.jsx";
import SearchPanel from "./SearchPanel.jsx";
import ReviewPanel from "./ReviewPanel.jsx";
import ConflictPanel from "./ConflictPanel.jsx";
import CheckpointsPanel from "./CheckpointsPanel.jsx";

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
const Editing = createContext(null);

function ComponentNode({ data, selected }) {
  const editing = useContext(Editing);
  const resize = (event, rect) => (document) => {
    const result = editing.resize(data.id, rect, event.altKey);
    return patchComponent(document, data.id, {
      pos: [result.x, result.y],
      size: [result.width, result.height],
    });
  };
  return (
    <div
      className={`component kind-${data.type} ${selected ? "chosen" : ""} ${editing.connecting ? "connecting" : ""}`}
    >
      <NodeResizer
        isVisible={
          selected &&
          !data.locked &&
          editing?.enabled &&
          editing.resizable !== false
        }
        minWidth={editing.minSize[0]}
        minHeight={editing.minSize[1]}
        onResizeStart={() => editing.start()}
        onResize={(event, rect) => editing.update(resize(event, rect))}
        onResizeEnd={(event, rect) => editing.end(resize(event, rect))}
      />
      {Object.entries(sides).map(([side, position]) => (
        <React.Fragment key={side}>
          <Handle
            id={`source-${side}`}
            type="source"
            position={position}
            isConnectable={editing.connecting && editing.enabled}
            aria-label={
              editing.connecting
                ? `Connect from ${data.label} ${side}`
                : undefined
            }
          />
          <Handle
            id={`target-${side}`}
            type="target"
            position={position}
            isConnectable={editing.connecting && editing.enabled}
            aria-label={
              editing.connecting
                ? `Connect to ${data.label} ${side}`
                : undefined
            }
          />
        </React.Fragment>
      ))}
      <span className="kind-icon" aria-hidden="true">
        {kinds[data.type] || "•"}
      </span>
      <div className="node-copy">
        <strong>{data.label}</strong>
        {data.locked && <span aria-label="Locked">Locked</span>}
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
function LifelineNode() {
  return <div className="lifeline" />;
}
function DragPoint({ point, label, edit, children, className = "", onRemove }) {
  const editing = useContext(Editing),
    flow = useReactFlow(),
    drag = useRef(null);
  return (
    <button
      className={`canvas-drag-point nodrag nopan ${className}`}
      aria-label={label}
      onClick={(event) => event.stopPropagation()}
      disabled={!editing.enabled}
      style={{
        transform: `translate(-50%, -50%) translate(${point[0]}px, ${point[1]}px)`,
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        const cursor = flow.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        drag.current = { ...cursor, origin: point, moved: false };
        editing.start();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        event.stopPropagation();
        const cursor = flow.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const target = [
          drag.current.origin[0] + cursor.x - drag.current.x,
          drag.current.origin[1] + cursor.y - drag.current.y,
        ].map((n) => Math.round(n * 100) / 100);
        drag.current.moved = true;
        drag.current.target = target;
        editing.update(edit(target));
      }}
      onPointerUp={(event) => {
        if (!drag.current) return;
        event.stopPropagation();
        editing.end(drag.current.moved ? edit(drag.current.target) : null);
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
        editing.end(null);
      }}
      onContextMenu={(event) => {
        if (onRemove) {
          event.preventDefault();
          onRemove();
        }
      }}
      onKeyDown={(event) => {
        if (onRemove && ["Delete", "Backspace"].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          onRemove();
          return;
        }
        const delta = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        }[event.key];
        if (!delta) return;
        event.preventDefault();
        event.stopPropagation();
        const step = event.shiftKey ? 10 : 1;
        editing.start();
        editing.end(
          edit([point[0] + delta[0] * step, point[1] + delta[1] * step]),
        );
      }}
    >
      {children}
    </button>
  );
}
function ConnectionEdge(props) {
  const editing = useContext(Editing);
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
  if (data.sequenceLine)
    result = [
      data.sequenceLine
        .map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`)
        .join(" "),
      ...data.labelAt,
    ];
  const point =
    data.labelAt ||
    automaticLabelPoint(
      [result[1] + (data.labelDx || 0), result[2] + (data.labelDy || 0)],
      data.label || "",
      data.editorBoxes || [],
    );
  return (
    <>
      <BaseEdge
        id={props.id}
        path={result[0]}
        markerEnd={props.markerEnd}
        style={{
          stroke: props.selected ? "#087b72" : "#82929c",
          strokeWidth: props.selected ? 2.5 : 1.5,
          strokeDasharray: data.variant === "dashed" ? "5 4" : undefined,
        }}
        label={undefined}
        labelX={point[0]}
        labelY={point[1]}
        labelStyle={{ fill: "#3d4d57", fontSize: 10 }}
        labelBgStyle={{ fill: "#f8fafb", fillOpacity: 0.96 }}
        labelBgPadding={[5, 3]}
      />
      {data.label && (
        <EdgeLabelRenderer>
          <DragPoint
            point={point}
            label={`Move label: ${data.label}`}
            edit={(labelAt) => (document) =>
              patchConnection(document, Number(props.id.slice(2)), { labelAt })
            }
            className="connection-label"
          >
            {data.label}
          </DragPoint>
        </EdgeLabelRenderer>
      )}
      {props.selected && (
        <EdgeLabelRenderer>
          {(data.via || []).map((point, index) => (
            <DragPoint
              key={index}
              point={point}
              label={`Move waypoint ${index + 1}`}
              className="waypoint"
              edit={(target) => (document) =>
                patchConnection(document, Number(props.id.slice(2)), {
                  via: data.via.map((p, i) => (i === index ? target : p)),
                })
              }
              onRemove={() => {
                editing.start();
                editing.end((document) =>
                  patchConnection(document, Number(props.id.slice(2)), {
                    via: data.via.filter((_, i) => i !== index),
                  }),
                );
              }}
            >
              {index + 1}
            </DragPoint>
          ))}
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const nodeTypes = {
    component: ComponentNode,
    boundary: BoundaryNode,
    lifeline: LifelineNode,
  },
  edgeTypes = { connection: ConnectionEdge };

function Field({ label, value, onCommit, number = false, mixed = false }) {
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
        placeholder={mixed ? "Mixed values" : undefined}
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
  const [diagnostics, setDiagnostics] = useState([]);
  const [creation, setCreation] = useState(null);
  const [recovery, setRecovery] = useState(null);
  const recoveredText = useRef(null);
  const [session, setSession] = useState(null),
    [saved, setSaved] = useState("");
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [sourceBase, setSourceBase] = useState(null),
    [conflict, setConflict] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [drawConnections, setDrawConnections] = useState(false);
  const [locked, setLocked] = useState([]);
  const lockKey = (data) => `archify-locks:${data.recoveryKey}:${data.name}`;
  function updateLocks(next) {
    setLocked(next);
    try {
      localStorage.setItem(lockKey(session), JSON.stringify(next));
    } catch {
      setNotice(
        "Locks apply for this session; browser storage is unavailable.",
      );
    }
  }
  const [gridSize, setGridSize] = useState(10),
    [smartSnap, setSmartSnap] = useState(false),
    [guides, setGuides] = useState([]);
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
  const options = editingOptions(documentModel);
  const presentText = useMemo(() => state ? serialize(state.present) : "", [state?.present]);
  const dirty = Boolean(state && presentText !== saved);
  const rawDirty = Boolean(
    state && panel === "json" && jsonText !== presentText,
  );
  const hasUnsaved = dirty || rawDirty || Boolean(draft);

  useEffect(() => {
    fetch("/api/document")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        load(data);
        try {
          const stored = localStorage.getItem(
            `archify-draft:${data.recoveryKey}`,
          );
          if (stored) {
            const candidate = JSON.parse(stored);
            if (candidate.version === 1 && candidate.document)
              setRecovery(candidate);
          }
        } catch {
          setNotice("The saved recovery draft could not be read.");
        }
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
    if (state) {
      setJsonText(recoveredText.current ?? serialize(state.present));
      recoveredText.current = null;
    }
    setHtml(null);
    setDiagnostics([]);
  }, [state]);
  useEffect(() => {
    if (!session?.recoveryKey || !state || recovery) return;
    const key = `archify-draft:${session.recoveryKey}`;
    try {
      if (dirty || rawDirty)
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            document: state.present,
            rawText: rawDirty ? jsonText : null,
            saved,
            name: session.name,
            writable: session.writable,
            revision: session.revision,
            savedAt: new Date().toISOString(),
          }),
        );
      else localStorage.removeItem(key);
    } catch {
      setNotice(
        "Draft recovery storage is unavailable. Save or download your JSON.",
      );
    }
  }, [state, session, dirty, rawDirty, jsonText, saved, recovery]);
  useEffect(() => {
    if (html) dialog.current?.showModal();
  }, [html]);
  // Pointer dragging may leave focus on the document body. Capture shortcuts at
  // the window so cancelling does not depend on React Flow's focus ownership.
  useEffect(() => {
    const cancel = () => {
      if (dragBase.current) {
        setGuides([]);
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
    setSourceBase(data.document);
    setConflict(null);
    try {
      const value = JSON.parse(localStorage.getItem(lockKey(data)) || "[]");
      setLocked(
        Array.isArray(value)
          ? value.filter((id) => typeof id === "string")
          : [],
      );
    } catch {
      setLocked([]);
    }
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
    // Fit once after React Flow measures a newly opened document. A delayed
    // second fit can move a resize handle out from under the user's pointer.
    setCanvasVersion((version) => version + 1);
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
      throw Object.assign(new Error(data.error), {
        diagnostics: data.diagnostics,
        status: response.status,
      });
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
      setDiagnostics(e.diagnostics || []);
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
        let data;
        try {
          data = await (await request("document", snapshot, "PUT")).json();
        } catch (e) {
          if (e.status === 409) {
            await compareSource(snapshot);
            return;
          }
          throw e;
        }
        setSourceBase(snapshot);
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
  async function compareSource(local = state.present) {
    const response = await fetch("/api/document");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setConflict({
      base: sourceBase,
      local,
      remote: data.document,
      revision: data.revision,
    });
    setPanel("conflict");
    setCreation(null);
    setNotice("Source changed. Compare and resolve changes before saving.");
  }
  async function applyMerge(merged) {
    await act(async () => {
      if (serialize(state.present) !== serialize(conflict.local))
        throw new Error(
          "Your draft changed during comparison. Refresh the comparison first.",
        );
      await request("validate", merged);
      change(merged);
      setSourceBase(conflict.remote);
      setSaved(serialize(conflict.remote));
      setSession((s) => ({ ...s, revision: conflict.revision }));
      setConflict(null);
      setPanel("review");
      setNotice(
        "Merged draft validated. Review it and save to write the file.",
      );
    });
  }
  function applyPatch(patch) {
    try {
      change(patchComponent(state.present, selection[0], patch));
    } catch (e) {
      setError(e.message);
    }
  }
  function paste(payload) {
    try {
      const result = pasteSelection(state.present, payload);
      change(result.document);
      setSelection(result.ids);
      setEdgeIndex(null);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    const onCopy = (event) => {
      if (
        event.target.closest("input,textarea,select,[contenteditable]") ||
        !selection.length ||
        !state ||
        busy ||
        rawDirty ||
        state.present.diagram_type !== "architecture"
      )
        return;
      try {
        const payload = copySelection(state.present, selection);
        event.clipboardData.setData("text/plain", JSON.stringify(payload));
        event.preventDefault();
        setClipboard(payload);
        setNotice("Selection copied.");
      } catch (e) {
        setError(e.message);
      }
    };
    const onPaste = (event) => {
      if (
        event.target.closest("input,textarea,select,[contenteditable]") ||
        !state ||
        busy ||
        rawDirty
      )
        return;
      const text = event.clipboardData.getData("text/plain");
      if (!text.includes("archify-selection")) return;
      event.preventDefault();
      void act(async () => {
        if (text.length > 5 * 1024 * 1024)
          throw new Error("Selection exceeds 5 MB.");
        const result = pasteSelection(state.present, JSON.parse(text));
        await request("validate", result.document);
        change(result.document);
        setSelection(result.ids);
        setEdgeIndex(null);
      });
    };
    window.addEventListener("copy", onCopy);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("paste", onPaste);
    };
  });
  function edgePatch(patch) {
    try {
      change(patchConnection(state.present, edgeIndex, patch));
    } catch (e) {
      setError(e.message);
    }
  }
  function reset(kind, index = null) {
    try {
      const result = resetFields(state.present, selection, kind, index);
      if (!result.removed.length) {
        setNotice(
          "No optional overrides to reset. Required placement fields are kept.",
        );
        return;
      }
      if (
        window.confirm(
          `Remove these manual overrides?\n${result.removed.join("\n")}`,
        )
      )
        change(result.document);
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
      ...(options.regions?.(documentModel) || []).map((region) => ({
        id: region.id,
        type: region.type || "boundary",
        data: { label: region.label },
        position: { x: region.pos[0], y: region.pos[1] },
        style: { width: region.size[0], height: region.size[1] },
        measured: measurements[region.id],
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: -1,
      })),
      ...cs.map((c) => ({
        id: `c:${c.id}`,
        measured: measurements[`c:${c.id}`],
        type: "component",
        position: { x: c.pos[0], y: c.pos[1] },
        data: { ...c, locked: locked.includes(c.id) },
        draggable:
          !locked.includes(c.id) && !busy && !rawDirty && !drawConnections,
        selected: selection.includes(c.id),
        style: { width: c.size[0], height: c.size[1] },
        ariaLabel: `${c.label}, ${c.type}`,
      })),
    ];
  }, [
    documentModel,
    selection,
    measurements,
    locked,
    busy,
    rawDirty,
    drawConnections,
  ]);
  const edges = useMemo(
    () =>
      connections(documentModel).map((e, index) => ({
        id: `e:${index}`,
        source: `c:${e.from}`,
        target: `c:${e.to}`,
        sourceHandle: `source-${e.fromSide || "right"}`,
        targetHandle: `target-${e.toSide || "left"}`,
        data: {
          ...(options.edgeData?.(documentModel, e) || e),
          editorBoxes: components(documentModel),
        },
        type: "connection",
        selected: index === edgeIndex,
        markerEnd: { type: "arrowclosed", color: "#82929c" },
      })),
    [documentModel, edgeIndex],
  );
  // Overlap diagnostics describe committed edits; dragging must not run the
  // quadratic all-pairs check on every pointer event.
  const warnings = useMemo(() => state ? layoutWarnings(state.present) : [], [state?.present]);
  const selected = items.find((c) => c.id === selection[0]),
    edge = connections(documentModel)[edgeIndex];

  function onKeys(event) {
    if (dialog.current?.open) return;
    const editingText = event.target.closest(
      "input,textarea,select,[contenteditable]",
    );
    if (event.key === "Escape" && drawConnections) {
      cancelled.current = true;
      setDrawConnections(false);
    }
    if (event.key === "Escape" && dragBase.current) {
      setGuides([]);
      cancelled.current = true;
      setDraft(null);
      dragBase.current = null;
      event.stopPropagation();
      return;
    }
    if (
      editingText ||
      event.target.closest(".canvas-drag-point") ||
      busy ||
      rawDirty ||
      !state ||
      dragBase.current
    )
      return;
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "d" &&
      selection.length &&
      state.present.diagram_type === "architecture"
    ) {
      event.preventDefault();
      paste(copySelection(state.present, selection));
      return;
    }
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
              .filter((c) => selection.includes(c.id) && !locked.includes(c.id))
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
    <Editing.Provider
      value={{
        enabled: !busy && !rawDirty,
        connecting:
          drawConnections && documentModel?.diagram_type === "architecture",
        minSize: options.minSize,
        resizable: options.resizable,
        resize: (id, rect, bypass) => {
          const result = snapResize(
            dragBase.current || state.present,
            id,
            rect,
            { grid: snap ? gridSize : 0, smart: smartSnap, bypass },
          );
          setGuides(result.guides);
          return result.rect;
        },
        start: () => {
          dragBase.current = state.present;
          cancelled.current = false;
        },
        update: (edit) => {
          if (dragBase.current && !cancelled.current)
            setDraft((previous) => edit(previous || dragBase.current));
        },
        end: (edit) => {
          if (edit && dragBase.current && !cancelled.current)
            change(edit(dragBase.current));
          dragBase.current = null;
          setDraft(null);
          setGuides([]);
        },
      }}
    >
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
              disabled={!session || busy || rawDirty || !!draft}
              onClick={() => setCreation("diagram")}
            >
              New diagram
            </button>
            <button
              disabled={
                !state ||
                busy ||
                rawDirty ||
                !!draft ||
                documentModel.diagram_type !== "architecture"
              }
              onClick={() => setCreation("component")}
            >
              Add component
            </button>
            <button
              disabled={
                !state ||
                busy ||
                rawDirty ||
                !!draft ||
                documentModel.diagram_type !== "architecture"
              }
              onClick={() => setCreation("connection")}
            >
              Add connection
            </button>
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
            <button
              disabled={!state || busy || rawDirty || !!draft}
              onClick={() =>
                act(async () => {
                  await request("render", state.present);
                  setDiagnostics([]);
                  setNotice("Archify validation passed.");
                })
              }
            >
              Check diagram
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
        {recovery && (
          <div className="recovery-banner" role="status">
            <span>
              Unsaved draft available: {recovery.name}.{" "}
              {recovery.revision !== session.revision
                ? "The source changed; recovery will open a separate draft."
                : "Restore it or keep the file currently open."}
            </span>
            <button
              onClick={() =>
                act(async () => {
                  assertDocument(recovery.document);
                  await request("validate", recovery.document);
                  const changedSource = recovery.revision !== session.revision;
                  setSession((current) => ({
                    ...current,
                    name: recovery.name,
                    writable: Boolean(recovery.writable && !changedSource),
                  }));
                  recoveredText.current = recovery.rawText;
                  setState(history(recovery.document));
                  setSaved(recovery.saved);
                  setPanel(recovery.rawText ? "json" : "inspector");
                  setRecovery(null);
                  setNotice(
                    changedSource
                      ? "Recovered separately. Download this draft to avoid overwriting the changed source."
                      : "Unsaved draft restored.",
                  );
                })
              }
            >
              Restore draft
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(`archify-draft:${session.recoveryKey}`);
                setRecovery(null);
              }}
            >
              Discard recovery
            </button>
          </div>
        )}
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
            <details className="connection-list">
              <summary>Connections</summary>
              {connections(documentModel).map((connection, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setEdgeIndex(index);
                    setSelection([]);
                  }}
                >
                  {connection.from} → {connection.to}
                </button>
              ))}
            </details>
            <div className="outline-foot">
              {documentModel?.diagram_type} diagram
              <br />
              <span>
                {connections(documentModel).length} connections ·{" "}
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
                key={canvasVersion}
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
                snapToGrid={
                  documentModel.diagram_type !== "architecture" && snap
                }
                snapGrid={[gridSize, gridSize]}
                nodesConnectable={drawConnections && !busy && !rawDirty}
                edgesReconnectable={
                  drawConnections &&
                  !busy &&
                  !rawDirty &&
                  documentModel.diagram_type === "architecture"
                }
                onConnectStart={() => {
                  cancelled.current = false;
                }}
                onReconnectStart={() => {
                  cancelled.current = false;
                }}
                onConnect={(connection) => {
                  if (
                    cancelled.current ||
                    !drawConnections ||
                    documentModel.diagram_type !== "architecture"
                  )
                    return;
                  try {
                    let next = addConnection(state.present, {
                      from: connection.source.slice(2),
                      to: connection.target.slice(2),
                    });
                    next = reconnectConnection(
                      next,
                      next.connections.length - 1,
                      {
                        from: connection.source.slice(2),
                        to: connection.target.slice(2),
                        fromSide: connection.sourceHandle?.replace(
                          "source-",
                          "",
                        ),
                        toSide: connection.targetHandle?.replace("target-", ""),
                      },
                    );
                    change(next);
                    setSelection([]);
                    setEdgeIndex(next.connections.length - 1);
                  } catch (e) {
                    setError(e.message);
                  }
                }}
                onReconnect={(edge, connection) => {
                  if (cancelled.current || !drawConnections) return;
                  try {
                    change(
                      reconnectConnection(
                        state.present,
                        Number(edge.id.slice(2)),
                        {
                          from: connection.source.slice(2),
                          to: connection.target.slice(2),
                          fromSide: connection.sourceHandle?.replace(
                            "source-",
                            "",
                          ),
                          toSide: connection.targetHandle?.replace(
                            "target-",
                            "",
                          ),
                        },
                      ),
                    );
                  } catch (e) {
                    setError(e.message);
                  }
                }}
                deleteKeyCode={null}
                nodesDraggable={!busy && !rawDirty && !drawConnections}
                elementsSelectable={!busy}
                selectionOnDrag
                panOnDrag={[1, 2]}
                panActivationKeyCode="Space"
                selectionKeyCode="Shift"
                multiSelectionKeyCode="Shift"
                onlyRenderVisibleElements={false}
                onNodesChange={(changes) => {
                  const dimensions = changes.filter(
                    (c) => c.type === "dimensions" && c.dimensions,
                  );
                  if (dimensions.length)
                    setMeasurements((previous) => {
                      let next = previous;
                      for (const { id, dimensions: measured } of dimensions) {
                        if (
                          previous[id]?.width === measured.width &&
                          previous[id]?.height === measured.height
                        )
                          continue;
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
                      c.id.startsWith("c:") &&
                      !locked.includes(c.id.slice(2)),
                  );
                  if (
                    positions.length &&
                    dragBase.current &&
                    !cancelled.current &&
                    documentModel.diagram_type !== "architecture"
                  )
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
                onNodeDrag={(event, node, draggedNodes) => {
                  if (
                    !dragBase.current ||
                    cancelled.current ||
                    documentModel.diagram_type !== "architecture"
                  )
                    return;
                  const result = snapPositions(
                    dragBase.current,
                    new Map(
                      (draggedNodes?.length ? draggedNodes : [node])
                        .filter(
                          (n) =>
                            n.id.startsWith("c:") &&
                            !locked.includes(n.id.slice(2)),
                        )
                        .map((n) => [
                          n.id.slice(2),
                          [n.position.x, n.position.y],
                        ]),
                    ),
                    {
                      grid: snap ? gridSize : 0,
                      smart: smartSnap,
                      bypass: event.altKey,
                    },
                  );
                  setGuides(result.guides);
                  setDraft(moveComponents(dragBase.current, result.positions));
                }}
                onNodeDragStop={(event, node, draggedNodes) => {
                  if (!cancelled.current && dragBase.current)
                    change(
                      moveComponents(
                        dragBase.current,
                        snapPositions(
                          dragBase.current,
                          new Map(
                            (draggedNodes?.length ? draggedNodes : [node])
                              .filter(
                                (n) =>
                                  n.id.startsWith("c:") &&
                                  !locked.includes(n.id.slice(2)),
                              )
                              .map((n) => [
                                n.id.slice(2),
                                [n.position.x, n.position.y],
                              ]),
                          ),
                          {
                            grid: snap ? gridSize : 0,
                            smart: smartSnap,
                            bypass: event.altKey,
                          },
                        ).positions,
                      ),
                    );
                  dragBase.current = null;
                  setDraft(null);
                  setGuides([]);
                }}
              >
                <Background gap={20} size={1} color="#cdd7dc" />
                <Controls showInteractive={false} />
                <ViewportPortal>
                  <div className="snap-guides" aria-hidden="true">
                    {guides.map((g, i) => (
                      <div
                        key={i}
                        className={`snap-guide ${g.axis ? "horizontal" : "vertical"}`}
                        style={g.axis ? { top: g.value } : { left: g.value }}
                      >
                        <span>{g.kind}</span>
                      </div>
                    ))}
                  </div>
                </ViewportPortal>
              </ReactFlow>
            )}
            <div className="canvas-help">
              Drag to move · Shift to select several · Space + drag to pan ·
              Arrow keys to nudge
            </div>
          </main>
          <aside className="inspector" aria-label="Document inspector">
            {documentModel?.diagram_type === "architecture" && (
              <label className="connection-mode">
                <input
                  type="checkbox"
                  checked={drawConnections}
                  disabled={busy || rawDirty}
                  onChange={(e) => setDrawConnections(e.target.checked)}
                />{" "}
                Draw / reconnect connections
              </label>
            )}
            <div className="tabs" aria-label="Inspector sections">
              {Object.entries({
                inspector: "Properties",
                json: "JSON",
                structure: "Structure",
                settings: "Settings",
                search: "Search",
                review: "Review",
                checkpoints: "Checkpoints",
                layout: "Auto-arrange",
                templates: "Templates",
              }).map(([key, label]) => (
                <button
                  key={key}
                  className={panel === key ? "active" : ""}
                  aria-pressed={panel === key}
                  disabled={
                    !state ||
                    busy ||
                    !!draft ||
                    (rawDirty && !["json", "inspector"].includes(key))
                  }
                  onClick={() => {
                    if (
                      rawDirty &&
                      key === "inspector" &&
                      !window.confirm("Discard unapplied JSON text changes?")
                    )
                      return;
                    if (key === "inspector")
                      setJsonText(serialize(state.present));
                    setCreation(null);
                    setPanel(key);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {creation ? (
              <form
                className="properties"
                onSubmit={(event) => {
                  event.preventDefault();
                  const fields = Object.fromEntries(
                    new FormData(event.currentTarget),
                  );
                  try {
                    if (creation === "diagram") {
                      if (
                        hasUnsaved &&
                        !window.confirm(
                          "Discard unsaved changes and create a diagram?",
                        )
                      )
                        return;
                      load({
                        ...session,
                        document: createDiagram(
                          fields.diagramType,
                          fields.label,
                        ),
                        name: `untitled.${fields.diagramType}.json`,
                        writable: false,
                      });
                      setSaved("");
                    } else if (creation === "component") {
                      const next = addComponent(state.present, fields);
                      change(next);
                      setSelection([next.components.at(-1).id]);
                      setEdgeIndex(null);
                    } else {
                      const next = addConnection(state.present, fields);
                      change(next);
                      setEdgeIndex(next.connections.length - 1);
                      setSelection([]);
                    }
                    setCreation(null);
                    setPanel("inspector");
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                <h2>
                  {creation === "diagram"
                    ? "New diagram"
                    : creation === "component"
                      ? "New component"
                      : "New connection"}
                </h2>
                <label className="field">
                  {creation === "diagram" ? "Diagram title" : "New label"}
                  <input
                    name="label"
                    required={creation !== "connection"}
                    autoFocus
                  />
                </label>
                {creation === "diagram" && (
                  <label className="field">
                    Diagram type
                    <select name="diagramType">
                      {authoringTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                )}
                {creation === "component" && (
                  <label className="field">
                    Component type
                    <select name="type">
                      {Object.keys(kinds).map((kind) => (
                        <option key={kind}>{kind}</option>
                      ))}
                    </select>
                  </label>
                )}
                {creation === "connection" &&
                  ["from", "to"].map((key) => (
                    <label className="field" key={key}>
                      {key === "from" ? "From component" : "To component"}
                      <select name={key} required>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                <div className="button-row">
                  <button type="button" onClick={() => setCreation(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary">
                    Create
                  </button>
                </div>
              </form>
            ) : panel === "templates" ? (
              <fieldset disabled={busy || !!draft}><TemplatesPanel document={state.present} selection={selection} onValidate={next=>request('validate',next)} onInsert={result=>{change(result.document);setSelection(result.ids);setEdgeIndex(null);}} onExport={(value,name)=>download(serialize(value),name,'application/json')}/></fieldset>
            ) : panel === "layout" ? (
              <fieldset disabled={busy || !!draft}><AutoLayoutPanel key={`${presentText}:${selection.join(',')}:${locked.join(',')}`} document={state.present} selection={selection} locked={locked} onApply={change}/></fieldset>
            ) : panel === "checkpoints" ? (
              <fieldset disabled={busy || !!draft}>
                <CheckpointsPanel
                  key={`${session.recoveryKey}:${session.name}`}
                  document={documentModel}
                  storageKey={`${session.recoveryKey}:${session.name}`}
                  onRestore={(snapshot) =>
                    act(async () => {
                      await request("validate", snapshot);
                      change(snapshot);
                      setSelection([]);
                      setEdgeIndex(null);
                      setNotice("Checkpoint restored as an undoable draft.");
                    })
                  }
                  onExport={(snapshot, name) =>
                    download(serialize(snapshot), name, "application/json")
                  }
                />
              </fieldset>
            ) : panel === "conflict" && conflict ? (
              <fieldset disabled={busy || !!draft}>
                <ConflictPanel
                  key={JSON.stringify(conflict)}
                  conflict={conflict}
                  onApply={applyMerge}
                  onRefresh={() => act(() => compareSource())}
                  onCancel={() => {
                    setConflict(null);
                    setPanel("review");
                  }}
                />
              </fieldset>
            ) : panel === "review" ? (
              <fieldset disabled={busy || !!draft}>
                <ReviewPanel
                  baseline={saved ? JSON.parse(saved) : null}
                  document={documentModel}
                  writable={session.writable}
                  onSave={saveJson}
                />
              </fieldset>
            ) : panel === "search" ? (
              <SearchPanel
                document={documentModel}
                onFocus={(result) => {
                  setSelection(result.kind === "node" ? result.ids : []);
                  setEdgeIndex(
                    result.kind === "connection" ? result.index : null,
                  );
                  flow.current?.fitView({
                    nodes: result.ids.map((id) => ({ id: `c:${id}` })),
                    padding: 0.5,
                    maxZoom: 1.5,
                  });
                }}
                onFit={() => {
                  const ids = selection.length
                    ? selection
                    : edge
                      ? [edge.from, edge.to]
                      : [];
                  if (ids.length)
                    flow.current?.fitView({
                      nodes: ids.map((id) => ({ id: `c:${id}` })),
                      padding: 0.5,
                      maxZoom: 1.5,
                    });
                }}
              />
            ) : panel === "settings" ? (
              <fieldset disabled={busy || !!draft}>
                <SettingsPanel
                  document={documentModel}
                  onChange={(operation) =>
                    act(async () => {
                      const next = operation();
                      await request("validate", next);
                      change(next);
                    })
                  }
                />
              </fieldset>
            ) : panel === "structure" ? (
              <fieldset disabled={busy || !!draft}>
                <StructurePanel
                  document={documentModel}
                  onChange={(operation) =>
                    act(async () => {
                      const next = operation();
                      await request("validate", next);
                      change(next);
                    })
                  }
                  onSelect={(ids) => {
                    setSelection(ids);
                    setEdgeIndex(null);
                    setPanel("inspector");
                  }}
                />
              </fieldset>
            ) : panel === "json" ? (
              <React.Suspense fallback={<p>Loading JSON editor…</p>}><JsonEditor text={jsonText} onChange={setJsonText} selectedPath={selection.length?`/${nodeKey(state.present)}/${sourceNodes(state.present).findIndex(c=>c.id===selection[0])}`:edgeIndex!==null?`/${edgeKey(state.present)}/${edgeIndex}`:''} onFocus={(path,value)=>{
                const [,collection,index]=path.split('/');const item=value[collection]?.[Number(index)];
                if(collection===nodeKey(state.present)&&sourceNodes(state.present).some(c=>c.id===item?.id)){setSelection([item.id]);setEdgeIndex(null);flow.current?.fitView({nodes:[{id:`c:${item.id}`}],padding:0.5,maxZoom:1.5});}
                else if(collection===edgeKey(state.present)){const i=item?.id?connections(state.present).findIndex(e=>e.id===item.id):-1;if(i>=0){setEdgeIndex(i);setSelection([]);}}
              }}>                <div className="button-row">
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
              </JsonEditor></React.Suspense>
            ) : (
              <div className="properties">
                {selected ? (
                  <>
                    <div className="selected-heading">
                      <span className="eyebrow">
                        {selection.length > 1
                          ? `${selection.length} selected`
                          : selected.type}
                      </span>
                      <h2>{selected.label}</h2>
                      <code>{selected.id}</code>
                    </div>
                    <fieldset disabled={busy || !!draft}>
                      {documentModel.diagram_type === "architecture" &&
                        selection.length > 1 && (
                          <details open>
                            <summary>Arrange selection</summary>
                            <div className="button-row">
                              {Object.entries(arrangements).map(
                                ([action, label]) => (
                                  <button
                                    key={action}
                                    disabled={
                                      action.startsWith("distribute") &&
                                      selection.length < 3
                                    }
                                    onClick={() => {
                                      try {
                                        change(
                                          arrange(
                                            state.present,
                                            selection,
                                            action,
                                          ),
                                        );
                                      } catch (e) {
                                        setError(e.message);
                                      }
                                    }}
                                  >
                                    {label}
                                  </button>
                                ),
                              )}
                            </div>
                          </details>
                        )}
                      <legend>Component</legend>
                      {documentModel.diagram_type !== "sequence" && (
                        <details>
                          <summary>Reset manual layout</summary>
                          <div className="button-row">
                            <button onClick={() => reset("position")}>
                              Reset position overrides
                            </button>
                            <button onClick={() => reset("size")}>
                              Reset size overrides
                            </button>
                          </div>
                          <p className="muted">
                            Only optional fields are removed. Free architecture
                            coordinates and logical columns, rows and lanes are
                            kept.
                          </p>
                        </details>
                      )}
                      <button
                        onClick={() =>
                          updateLocks(
                            selection.every((id) => locked.includes(id))
                              ? locked.filter((id) => !selection.includes(id))
                              : [...new Set([...locked, ...selection])],
                          )
                        }
                      >
                        {selection.every((id) => locked.includes(id))
                          ? "Unlock selection"
                          : "Lock selection"}
                      </button>
                      {selection.some((id) => locked.includes(id)) && (
                        <p className="muted">
                          Locked items cannot be dragged, resized or nudged.
                          Inspector edits remain available.
                        </p>
                      )}
                      {selection.length > 1 && (
                        <>
                          <p className="muted">
                            Changes apply to every selected item. Blank mixed
                            fields remain unchanged.
                          </p>
                          {[
                            "label",
                            "sublabel",
                            ...(options.resizable === false
                              ? []
                              : ["width", "height"]),
                          ].map((field) => {
                            const value = commonValue(
                              documentModel,
                              selection,
                              field,
                            );
                            return (
                              <Field
                                key={field}
                                label={`Selection ${field}`}
                                value={value}
                                mixed={value === undefined}
                                number={["width", "height"].includes(field)}
                                onCommit={(value) => {
                                  try {
                                    change(
                                      bulkPatch(
                                        state.present,
                                        selection,
                                        field,
                                        value,
                                      ),
                                    );
                                  } catch (e) {
                                    setError(e.message);
                                  }
                                }}
                              />
                            );
                          })}
                        </>
                      )}
                      {documentModel.diagram_type === "architecture" && (
                        <details>
                          <summary>Copy and duplicate</summary>
                          <div className="button-row">
                            <button
                              onClick={() =>
                                paste(copySelection(state.present, selection))
                              }
                            >
                              Duplicate selection
                            </button>
                            <button
                              onClick={() => {
                                setClipboard(
                                  copySelection(state.present, selection),
                                );
                                setNotice(
                                  "Selection copied inside the editor. Use Ctrl/Cmd+C on the canvas to copy to another window.",
                                );
                              }}
                            >
                              Copy selection
                            </button>
                            <button
                              disabled={!clipboard}
                              onClick={() => paste(clipboard)}
                            >
                              Paste selection
                            </button>
                          </div>
                          <p className="muted">
                            Ctrl/Cmd+D duplicates. Ctrl/Cmd+C and V copy and
                            paste on the canvas.
                          </p>
                        </details>
                      )}
                      {documentModel.diagram_type === "architecture" && (
                        <details>
                          <summary>Snapping</summary>
                          <label className="field">
                            Grid spacing
                            <input
                              type="number"
                              min="1"
                              max="200"
                              value={gridSize}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                if (Number.isInteger(n) && n >= 1 && n <= 200)
                                  setGridSize(n);
                              }}
                            />
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={smartSnap}
                              onChange={(e) => setSmartSnap(e.target.checked)}
                            />{" "}
                            Smart guides
                          </label>
                          <p className="muted">
                            Hold Alt while dragging or resizing to bypass
                            snapping.
                          </p>
                        </details>
                      )}
                      {selection.length === 1 && (
                        <>
                          {adapterFor(documentModel) && (
                            <div className="logical-properties">
                              <p className="muted">
                                {options.hint ||
                                  "Dragging snaps horizontally to columns and adjusts the vertical offset within the same lane."}
                              </p>
                              {options.fields.map((field) => (
                                <Field
                                  key={field}
                                  label={
                                    {
                                      col: "Column",
                                      yOffset: "Vertical offset",
                                      stage: "Stage",
                                      row: "Row",
                                      order: "Participant order",
                                    }[field] || field
                                  }
                                  value={selected[field] ?? 0}
                                  number
                                  onCommit={(value) =>
                                    applyPatch({ [field]: value })
                                  }
                                />
                              ))}
                              {selected.lane && (
                                <label className="field">
                                  Lane
                                  <select
                                    value={selected.lane}
                                    onChange={(e) =>
                                      applyPatch({ lane: e.target.value })
                                    }
                                  >
                                    {documentModel.lanes.map((lane) => (
                                      <option key={lane.id} value={lane.id}>
                                        {lane.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              )}
                            </div>
                          )}
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
                          {options.resizable !== false && (
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
                          )}
                          {documentModel.layout &&
                            Number.isInteger(selected.row) &&
                            Number.isInteger(selected.col) && (
                              <button
                                onClick={() => applyPatch({ pos: undefined })}
                              >
                                Reset to grid position
                              </button>
                            )}
                        </>
                      )}
                    </fieldset>
                    <p className="muted">
                      Moving this component keeps its connections and boundary
                      membership.
                    </p>
                    {documentModel.diagram_type === "architecture" && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Delete ${deletionSummary(state.present, selection)}? Undo restores the complete edit.`,
                            )
                          )
                            return;
                          try {
                            change(removeSelection(state.present, selection));
                            setSelection([]);
                          } catch (e) {
                            setError(e.message);
                          }
                        }}
                      >
                        {selection.length > 1
                          ? "Delete selection"
                          : "Delete component"}
                      </button>
                    )}
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
                      {documentModel.diagram_type !== "sequence" && (
                        <details>
                          <summary>Reset manual routing</summary>
                          <div className="button-row">
                            <button onClick={() => reset("label", edgeIndex)}>
                              Reset label placement
                            </button>
                            <button onClick={() => reset("route", edgeIndex)}>
                              Reset waypoints
                            </button>
                          </div>
                          <p className="muted">
                            Label reset removes labelAt, labelDx and labelDy.
                            Waypoint reset removes via. Route strategy and
                            endpoint sides are kept.
                          </p>
                        </details>
                      )}
                      {documentModel.diagram_type === "architecture" && (
                        <>
                          {["from", "to"].map((key) => (
                            <label key={key} className="field">
                              {key === "from"
                                ? "From component"
                                : "To component"}
                              <select
                                value={edge[key]}
                                onChange={(e) => {
                                  try {
                                    change(
                                      reconnectConnection(
                                        state.present,
                                        edgeIndex,
                                        {
                                          from: edge.from,
                                          to: edge.to,
                                          [key]: e.target.value,
                                        },
                                      ),
                                    );
                                  } catch (error) {
                                    setError(error.message);
                                  }
                                }}
                              >
                                {items.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                          <p className="muted">
                            Enable connection mode to drag between handles or
                            move either endpoint. Escape exits connection mode.
                          </p>
                        </>
                      )}
                      {documentModel.diagram_type === "sequence" ? (
                        <>
                          <Field
                            label="Message label"
                            value={edge.label}
                            onCommit={(label) => edgePatch({ label })}
                          />
                          <Field
                            label="Message Y"
                            value={edge.y}
                            number
                            onCommit={(y) => edgePatch({ y })}
                          />
                          <Field
                            label="Message note"
                            value={edge.note}
                            onCommit={(note) => edgePatch({ note })}
                          />
                          <p className="muted">
                            Drag a message label vertically to adjust spacing.
                            Allowed Y:{" "}
                            {messageRange(documentModel, edgeIndex).join("–")}.
                            Messages cannot cross each other or
                            activation/segment boundaries. Messages on a
                            boundary stay pinned.
                          </p>
                        </>
                      ) : (
                        <>
                          {documentModel.diagram_type === "architecture" && (
                            <button
                              onClick={() => {
                                change(
                                  removeConnection(state.present, edgeIndex),
                                );
                                setEdgeIndex(null);
                              }}
                            >
                              Delete connection
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const from = items.find(
                                  (c) => c.id === edge.from,
                                ),
                                to = items.find((c) => c.id === edge.to);
                              edgePatch({
                                via: [
                                  ...(edge.via || []),
                                  [
                                    (from.pos[0] + to.pos[0]) / 2,
                                    (from.pos[1] + to.pos[1]) / 2,
                                  ],
                                ],
                              });
                            }}
                          >
                            Add waypoint
                          </button>
                          <p className="muted">
                            Drag numbered waypoints. Right-click a point, or
                            focus it and press Delete, to remove it.
                          </p>
                          <Field
                            label="Label"
                            value={edge.label}
                            onCommit={(label) => edgePatch({ label })}
                          />
                          {["fromSide", "toSide"].map((key) => (
                            <label className="field" key={key}>
                              {key === "fromSide"
                                ? "Source side"
                                : "Target side"}
                              <select
                                value={edge[key] || ""}
                                onChange={(e) =>
                                  edgePatch({
                                    [key]: e.target.value || undefined,
                                  })
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
                              onChange={(e) =>
                                edgePatch({ route: e.target.value })
                              }
                            >
                              {options.routes.map((r) => (
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
                            value={
                              edge.labelAt ? JSON.stringify(edge.labelAt) : ""
                            }
                            onCommit={(value) => pointField("labelAt", value)}
                          />
                          <p className="muted">
                            Blank coordinates restore automatic placement.
                            Archify computes the final route when rendering.
                          </p>
                        </>
                      )}
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
            <div className="diagnostic-report">
              <pre>{error}</pre>
              {diagnostics.map((issue, index) => (
                <div key={index} className="diagnostic-item">
                  <strong>{issue.code}</strong>
                  <p>{issue.message}</p>
                  <button
                    onClick={() => {
                      const subject = issue.subject || {},
                        pathMatch = subject.path?.match(
                          /^\/(components|connections|nodes|edges|flows|states|transitions|participants|messages)\/(\d+)/,
                        );
                      const collection = subject.collection || pathMatch?.[1],
                        itemIndex =
                          subject.index ??
                          (pathMatch ? Number(pathMatch[2]) : undefined);
                      if (
                        collection === edgeKey(state.present) &&
                        Number.isInteger(itemIndex)
                      ) {
                        setEdgeIndex(itemIndex);
                        setSelection([]);
                        setPanel("inspector");
                      } else if (
                        collection === nodeKey(state.present) &&
                        Number.isInteger(itemIndex)
                      ) {
                        setSelection([
                          sourceNodes(state.present)[itemIndex].id,
                        ]);
                        setEdgeIndex(null);
                        setPanel("inspector");
                      } else {
                        setPanel("json");
                      }
                    }}
                  >
                    Inspect issue {index + 1}
                  </button>
                  {issue.supportedFixes?.length > 0 && (
                    <ul>
                      {issue.supportedFixes.map((fix, i) => (
                        <li key={i}>{fix}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
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
    </Editing.Provider>
  );
}

createRoot(document.getElementById("root")).render(<App />);

