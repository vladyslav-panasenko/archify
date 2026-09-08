import React from "react";
import { settingFields, minimumCanvas, patchSettings } from "./settings.mjs";
const labels = {
  title: "Title",
  subtitle: "Subtitle / description",
  locale: "Locale",
  animation: "Animation",
  visual_preset: "Visual preset",
  quality_profile: "Quality profile",
  column_fit: "Participant columns",
};
export default function SettingsPanel({ document, onChange }) {
  const minimum = minimumCanvas(document.diagram_type);
  return (
    <form
      className="properties"
      key={JSON.stringify([document.meta, document.layout])}
      onSubmit={(e) => {
        e.preventDefault();
        const fields = Object.fromEntries(new FormData(e.currentTarget));
        if (document.diagram_type === "architecture")
          fields.gridEnabled = fields.gridEnabled === "on";
        onChange(() => patchSettings(document, fields));
      }}
    >
      <h2>Diagram settings</h2>
      <p className="muted">
        These settings are saved in JSON and affect Archify’s output. Snapping
        and locks are local editor preferences.
      </p>
      {settingFields(document.diagram_type).map((spec) => (
        <label className="field" key={spec.key}>
          {labels[spec.key]}
          {spec.enum ? (
            <select
              name={spec.key}
              defaultValue={document.meta[spec.key] || ""}
            >
              <option value="">Default</option>
              {spec.enum.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          ) : (
            <input
              name={spec.key}
              defaultValue={document.meta[spec.key] || ""}
              required={spec.key === "title"}
            />
          )}
        </label>
      ))}
      <div className="field-grid">
        {["canvasWidth", "canvasHeight"].map((key, i) => (
          <label className="field" key={key}>
            {i ? "Canvas height" : "Canvas width"}
            <input
              name={key}
              type="number"
              min={minimum[i]}
              defaultValue={document.meta.viewBox?.[i] ?? ""}
            />
          </label>
        ))}
      </div>
      <p className="muted">
        Leave both dimensions blank for the renderer defaults.
      </p>
      {document.diagram_type === "architecture" && (
        <details>
          <summary>Grid layout</summary>
          <label>
            <input
              type="checkbox"
              name="gridEnabled"
              defaultChecked={!!document.layout}
            />{" "}
            Use grid defaults
          </label>
          <p className="muted">
            Explicit positions remain unchanged. Grid changes affect items using
            row/column placement. Disabling the grid requires explicit positions
            for every item.
          </p>
          {["cols", "gapX", "gapY", "cellW", "cellH"].map((key) => (
            <label className="field" key={key}>
              {key}
              <input
                name={key}
                type="number"
                defaultValue={document.layout?.[key] ?? ""}
              />
            </label>
          ))}
        </details>
      )}
      <button>Save settings</button>
    </form>
  );
}
