import React, { useState } from "react";
import {
  templateKey,
  checkTemplates,
  saveTemplate,
  renameTemplate,
  exportTemplate,
  importTemplate,
} from "./templates.mjs";
import { pasteSelection } from "./clipboard.mjs";
import { createDiagram } from "./topology.mjs";

export default function TemplatesPanel({
  document,
  selection,
  onInsert,
  onExport,
  onValidate,
}) {
  const [initial] = useState(() => {
    try {
      return {
        entries: checkTemplates(
          JSON.parse(localStorage.getItem(templateKey) || "[]"),
        ),
      };
    } catch (e) {
      return { entries: [], error: e.message };
    }
  });
  const [entries, setEntries] = useState(initial.entries),
    [name, setName] = useState(""),
    [error, setError] = useState(initial.error || ""),
    [pending, setPending] = useState(false);
  const run = async (fn) => {
    setPending(true);
    try {
      await fn();
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  };
  const write = (next) => {
    localStorage.setItem(templateKey, JSON.stringify(checkTemplates(next)));
    setEntries(next);
  };
  return (
    <div className="properties">
      <h2>Reusable templates</h2>
      <p>
        Save selected items and their internal connections for any supported diagram type. Up
        to 20 templates and 2 MB in this browser. Export a copy before clearing
        browser data.
      </p>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={pending || !!initial.error}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const next = saveTemplate(entries, name, document, selection);
              await onValidate(
                pasteSelection(createDiagram(document.diagram_type, "Template validation"), next.at(-1).fragment).document,
              );
              write(next);
              setName("");
            });
          }}
        >
          <label className="field">
            Template name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
            />
          </label>
          <button
            disabled={!selection.length}
          >
            Save selection as template
          </button>
        </form>
        <label className="field">
          Import template
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const file = e.target.files[0];
              e.target.value = "";
              if (file)
                run(async () => {
                  if (file.size > 2 * 1024 * 1024)
                    throw new Error("Template exceeds 2 MB.");
                  const next = importTemplate(
                    entries,
                    JSON.parse(await file.text()),
                  );
                  await onValidate(
                    pasteSelection(createDiagram(next.at(-1).fragment.diagram_type, "Template validation"), next.at(-1).fragment)
                      .document,
                  );
                  write(next);
                });
            }}
          />
        </label>
        {entries.map((entry) => (
          <section className="checkpoint" key={entry.id}>
            <h3>{entry.name}</h3>
            <p>
              {entry.fragment.components.length} items ·{" "}
              {entry.fragment.connections.length} connections
            </p>
            <div className="review-actions">
              <button
                disabled={document.diagram_type !== entry.fragment.diagram_type}
                onClick={() =>
                  run(async () => {
                    const result = pasteSelection(document, entry.fragment);
                    await onValidate(result.document);
                    onInsert(result);
                  })
                }
              >
                Insert {entry.name}
              </button>
              <button
                onClick={() =>
                  onExport(
                    exportTemplate(entry),
                    `${entry.name.replace(/[^a-z0-9_-]/gi, "_")}.template.json`,
                  )
                }
              >
                Export {entry.name}
              </button>
              <button
                onClick={() => {
                  const value = window.prompt("New template name", entry.name);
                  if (value !== null)
                    run(() => write(renameTemplate(entries, entry.id, value)));
                }}
              >
                Rename {entry.name}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Delete template “${entry.name}”?`))
                    run(() => write(entries.filter((e) => e.id !== entry.id)));
                }}
              >
                Delete {entry.name}
              </button>
            </div>
          </section>
        ))}
        {!entries.length && <p>No templates saved yet.</p>}
      </fieldset>
    </div>
  );
}
