import React from "react";
export const panelGroups = [
  {
    label: "Edit",
    panels: {
      inspector: "Properties",
      samples: "Starters",
      structure: "Structure",
      layout: "Auto-arrange",
      templates: "Templates",
      packs: "Diagram packs",
      ports: "Ports",
    },
  },
  {
    label: "Inspect",
    panels: {
      json: "JSON",
      search: "Search",
      problems: "Problems",
      compare: "Compare layout",
      review: "Review",
      comments: "Comments",
      refinement: "Refinement",
      interchange: "Interchange",
    },
  },
  {
    label: "Document",
    panels: {
      history: "History",
      versions: "Saved versions",
      settings: "Settings",
      checkpoints: "Checkpoints",
      migration: "Migration",
      help: "Help",
      shortcuts: "Shortcuts",
      saveas: "Save As",
      batch: "Batch",
      extensions: "Extensions",
    },
  },
];
export const panelLabels = Object.assign(
  {},
  ...panelGroups.map((g) => g.panels),
);
export default function EditorNavigation({ panel, disabled, onSelect }) {
  return (
    <nav className="editor-navigation" aria-label="Inspector sections">
      <details open>
        <summary>Tools · {panelLabels[panel] || "Document"}</summary>
        <div className="tabs">
          {panelGroups.map((group) => (
            <div className="panel-group" key={group.label}>
              <span>{group.label}</span>
              <div>
                {Object.entries(group.panels).map(([key, label]) => (
                  <button
                    key={key}
                    className={panel === key ? "active" : ""}
                    aria-pressed={panel === key}
                    disabled={disabled(key)}
                    onClick={() => onSelect(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </nav>
  );
}
