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
  const [error, setError] = useState("");
  const [mode, setMode] = useState("grid"),
    [direction, setDirection] = useState("right"),
    [gap, setGap] = useState(60);
  const boxes = preview ? components(preview) : [];
  return (
    <div className="properties">
      <h2>Auto-arrange selection</h2>
      <p>
        Arrange unlocked selected architecture components, avoiding other
        components. Directed layout follows connections and orders layers to
        reduce crossings; cycles share a layer. Connections, waypoints and
        labels retain their authored values. The layout can extend beyond the
        canvas; inspect it before rendering. Around fixed neighbors positions
        the selected group relative to directly connected unselected or locked
        components. Multiple anchors are balanced; obstacles take precedence.
        Without fixed neighbors it uses directed layout.
      </p>
      {error && <p role="alert">{error}</p>}
      {!preview && (
        <>
          <label className="field">
            Layout method
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="grid">Grid</option>
              <option value="directed">Follow connections</option>
              <option value="anchored">Around fixed neighbors</option>
            </select>
          </label>
          <label className="field">
            Layout direction
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              disabled={mode === "grid"}
            >
              <option value="right">Left to right</option>
              <option value="down">Top to bottom</option>
            </select>
          </label>
          <label className="field">
            Layout spacing
            <input
              type="number"
              min="16"
              max="500"
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
            />
          </label>
        </>
      )}
      {!preview ? (
        <button
          disabled={
            document.diagram_type !== "architecture" || !selection.length
          }
          onClick={() => {
            try {
              onPreview(
                autoLayout(document, selection, locked, {
                  mode,
                  direction,
                  gap,
                }),
              );
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
          <p>
            The main canvas shows the proposed arrangement. Pan or zoom to
            inspect it. Apply commits one JSON edit; Cancel or Escape restores
            the original.
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
