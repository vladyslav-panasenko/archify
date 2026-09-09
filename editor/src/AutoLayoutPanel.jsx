import React, { useState } from "react";
import { autoLayout } from "./auto-layout.mjs";
import { components } from "./document.mjs";

export default function AutoLayoutPanel({
  document,
  selection,
  locked,
  onApply,
  preview,
  onPreview,
}) {
  const
    [error, setError] = useState("");
  const boxes = preview ? components(preview) : [];
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
              onPreview(autoLayout(document, selection, locked));
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
          <p>The main canvas shows the proposed arrangement. Pan or zoom to inspect it. Apply commits one JSON edit; Cancel or Escape restores the original.</p>
          <ul>
            {boxes
              .filter((c) => selection.includes(c.id) && !locked.includes(c.id))
              .map((c) => (
                <li key={c.id}>
                  {c.label}: {c.pos.join(", ")}
                </li>
              ))}
          </ul>
          <button onClick={() => onPreview(null)}>Cancel arrangement</button>
          <button
            onClick={() => {
              onApply(preview);
              onPreview(null);
            }}
          >
            Apply arrangement
          </button>
        </>
      )}
    </div>
  );
}

