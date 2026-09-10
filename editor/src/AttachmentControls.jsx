import React from "react";
export default function AttachmentControls({ edge, disabled, onChange }) {
  return (
    <fieldset
      className="canvas-attachments"
      disabled={disabled}
      aria-label="Connection attachments"
    >
      <legend>Connection attachments</legend>
      {["fromSide", "toSide"].map((key) => (
        <label key={key}>
          {key === "fromSide" ? `From ${edge.from}` : `To ${edge.to}`}
          <select
            aria-label={
              key === "fromSide"
                ? "Canvas source attachment"
                : "Canvas target attachment"
            }
            value={edge[key] || ""}
            onChange={(event) =>
              onChange({ [key]: event.target.value || undefined })
            }
          >
            <option value="">Automatic</option>
            {["top", "right", "bottom", "left"].map((side) => (
              <option key={side}>{side}</option>
            ))}
          </select>
        </label>
      ))}
    </fieldset>
  );
}
