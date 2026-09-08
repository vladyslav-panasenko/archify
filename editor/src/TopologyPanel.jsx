import React from "react";
import StagesPanel from "./StagesPanel.jsx";
import { sourceNodes, connections } from "./adapters/index.mjs";
import {
  addNode,
  saveEdge,
  deleteEdge,
  deleteNode,
  saveLane,
  deleteLane,
  componentKinds,
  stateKinds,
} from "./topology.mjs";
export function Endpoint({ document, name, value }) {
  return (
    <label className="field">
      {name === "from" ? "From" : "To"}
      <select name={name} defaultValue={value}>
        {sourceNodes(document).map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export default function TopologyPanel({ document, onChange, onSelect }) {
  const nodes = sourceNodes(document),
    edges = connections(document);
  return (
    <div className="properties">
      <h2>{document.diagram_type} structure</h2>
      <p className="muted">
        Deleting a node also removes its connections and dependent references.
        Every edit can be undone.
      </p>
      <>
        {document.diagram_type === "dataflow" ? (
          <StagesPanel document={document} onChange={onChange} />
        ) : (
          <details>
            <summary>Lanes</summary>
            {document.lanes.map((lane, index) => (
              <section key={JSON.stringify(lane)}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onChange(() =>
                      saveLane(document, index, {
                        label: new FormData(e.currentTarget).get("label"),
                      }),
                    );
                  }}
                >
                  <label className="field">
                    Lane label
                    <input name="label" defaultValue={lane.label} required />
                  </label>
                  <button>Save lane</button>
                </form>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      window.confirm(
                        "Delete this lane and reassign its nodes and groups to the chosen lane?",
                      )
                    )
                      onChange(() =>
                        deleteLane(
                          document,
                          index,
                          new FormData(e.currentTarget).get("reassign"),
                        ),
                      );
                  }}
                >
                  <label className="field">
                    Reassign to
                    <select name="reassign">
                      {document.lanes
                        .filter((l) => l.id !== lane.id)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button disabled={document.lanes.length <= 1}>
                    Delete lane
                  </button>
                </form>
              </section>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onChange(() =>
                  saveLane(
                    document,
                    null,
                    Object.fromEntries(new FormData(e.currentTarget)),
                  ),
                );
              }}
            >
              <label className="field">
                New lane label
                <input name="label" required />
              </label>
              <>
                {document.diagram_type === "lifecycle" && (
                  <label className="field">
                    Lane band
                    <select name="id">
                      {["main", "event", "event-2", "terminal"]
                        .filter(
                          (id) => !document.lanes.some((l) => l.id === id),
                        )
                        .map((id) => (
                          <option key={id}>{id}</option>
                        ))}
                    </select>
                  </label>
                )}
              </>
              <button>Add lane</button>
            </form>
          </details>
        )}
      </>
      <details open>
        <summary>Add node</summary>
        <form
          key={nodes.length}
          onSubmit={(e) => {
            e.preventDefault();
            const fields = Object.fromEntries(new FormData(e.currentTarget));
            onChange(() => addNode(document, fields));
          }}
        >
          <label className="field">
            Node label
            <input name="label" required />
          </label>
          <label className="field">
            Node type
            <select name="type">
              {(document.diagram_type === "lifecycle"
                ? stateKinds
                : componentKinds
              ).map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
          </label>
          <>
            {document.diagram_type === "dataflow" ? (
              <>
                <label className="field">
                  Node stage
                  <select name="stage">
                    {document.stages.map((s, i) => (
                      <option key={i} value={i}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Node row
                  <input
                    name="row"
                    type="number"
                    min="0"
                    max="4"
                    defaultValue="1"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  Node lane
                  <select name="lane">
                    {document.lanes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Node column
                  <input
                    type="number"
                    name="col"
                    min="0"
                    max={document.diagram_type === "lifecycle" ? 4 : 5}
                    defaultValue={Math.min(
                      nodes.length,
                      document.diagram_type === "lifecycle" ? 4 : 5,
                    )}
                  />
                </label>
              </>
            )}
          </>
          <button>Create node</button>
        </form>
      </details>
      <details>
        <summary>Nodes</summary>
        {nodes.map((node) => (
          <div className="structure-item" key={node.id}>
            <span>{node.label}</span>
            <button onClick={() => onSelect([node.id])}>Edit {node.id}</button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${node.label}, its connections and dependent references?`,
                  )
                )
                  onChange(() => deleteNode(document, node.id));
              }}
            >
              Delete {node.id}
            </button>
          </div>
        ))}
      </details>
      <details>
        <summary>Connections</summary>
        {[...edges, null].map((edge, index) => (
          <form
            key={
              edge
                ? `${index}:${JSON.stringify(edge)}`
                : `new-edge-${nodes.length}`
            }
            onSubmit={(e) => {
              e.preventDefault();
              onChange(() =>
                saveEdge(
                  document,
                  edge ? index : null,
                  Object.fromEntries(new FormData(e.currentTarget)),
                ),
              );
            }}
          >
            <h3>
              {edge ? edge.id || `Connection ${index + 1}` : "New connection"}
            </h3>
            <Endpoint document={document} name="from" value={edge?.from} />
            <Endpoint
              document={document}
              name="to"
              value={edge?.to || nodes.at(-1).id}
            />
            <label className="field">
              Connection label
              <input name="label" defaultValue={edge?.label || ""} />
            </label>
            <button>{edge ? "Save connection" : "Create connection"}</button>
            {edge && (
              <button
                type="button"
                onClick={() => onChange(() => deleteEdge(document, index))}
              >
                Delete connection
              </button>
            )}
          </form>
        ))}
      </details>
    </div>
  );
}
