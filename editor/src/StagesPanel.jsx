import React from "react";
import { saveStage, deleteStage } from "./topology.mjs";
export default function StagesPanel({ document, onChange }) {
  return (
    <details>
      <summary>Stages</summary>
      {document.stages.map((stage, index) => (
        <section key={`${index}:${stage.label}`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onChange(() =>
                saveStage(
                  document,
                  index,
                  new FormData(e.currentTarget).get("label"),
                ),
              );
            }}
          >
            <label className="field">
              Stage label
              <input name="label" defaultValue={stage.label} required />
            </label>
            <button>Save stage</button>
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const target = Number(
                new FormData(e.currentTarget).get("reassign"),
              );
              if (
                window.confirm(
                  "Delete this stage and reassign its nodes to the chosen stage? Later stage indices will be updated.",
                )
              )
                onChange(() => deleteStage(document, index, target));
            }}
          >
            <label className="field">
              Reassign stage
              <select name="reassign">
                {document.stages.map(
                  (s, i) =>
                    i !== index && (
                      <option key={i} value={i}>
                        {s.label}
                      </option>
                    ),
                )}
              </select>
            </label>
            <button disabled={document.stages.length <= 2}>Delete stage</button>
          </form>
        </section>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onChange(() =>
            saveStage(
              document,
              null,
              new FormData(e.currentTarget).get("label"),
            ),
          );
        }}
      >
        <label className="field">
          New stage label
          <input name="label" required />
        </label>
        <button disabled={document.stages.length >= 5}>Add stage</button>
      </form>
    </details>
  );
}
