import React, { useState } from "react";
import { autoLayout } from "./auto-layout.mjs";
import { components } from "./document.mjs";

export default function AutoLayoutPanel({
  document,
  selection,
  locked,
  onApply,
}) {
  const [preview, setPreview] = useState(null),
    [error, setError] = useState("");
  const boxes = preview ? components(preview) : [];
  const width = Math.max(400, ...boxes.map((c) => c.pos[0] + c.size[0] + 20)),
    height = Math.max(250, ...boxes.map((c) => c.pos[1] + c.size[1] + 20));
  return (
    <div className="properties">
      <h2>Auto-arrange selection</h2>
      <p>
        Place unlocked selected architecture components in a stable grid,
        avoiding other components. Connections, waypoints and labels retain
        their authored values. The layout can extend beyond the canvas; inspect
        it before rendering.
      </p>
      {error && <p role="alert">{error}</p>}
      {!preview ? (
        <button
          disabled={
            document.diagram_type !== "architecture" || !selection.length
          }
          onClick={() => {
            try {
              setPreview(autoLayout(document, selection, locked));
              setError("");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Preview arrangement
        </button>
      ) : (
        <>
          <svg
            role="img"
            aria-label="Proposed component arrangement"
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: "100%", minHeight: 200, background: "#f4f7f8" }}
          >
            {boxes.map((c) => (
              <g key={c.id}>
                <rect
                  x={c.pos[0]}
                  y={c.pos[1]}
                  width={c.size[0]}
                  height={c.size[1]}
                  fill={
                    selection.includes(c.id) && !locked.includes(c.id)
                      ? "#ccece6"
                      : "#e0e5e8"
                  }
                  stroke="#49616b"
                />
                <text x={c.pos[0] + 4} y={c.pos[1] + 18} fontSize="12">
                  {c.label}
                </text>
              </g>
            ))}
          </svg>
          <p>
            Green boxes are the selected items to arrange. Grey boxes stay in
            place.
          </p>
          <ul>
            {boxes
              .filter((c) => selection.includes(c.id) && !locked.includes(c.id))
              .map((c) => (
                <li key={c.id}>
                  {c.label}: {c.pos.join(", ")}
                </li>
              ))}
          </ul>
          <button onClick={() => setPreview(null)}>Cancel arrangement</button>
          <button
            onClick={() => {
              onApply(preview);
              setPreview(null);
            }}
          >
            Apply arrangement
          </button>
        </>
      )}
    </div>
  );
}
