import React, { useState, useRef } from "react";
import { searchDiagram } from "./search.mjs";
export default function SearchPanel({ document, onFocus, onFit }) {
  const [query, setQuery] = useState(""),
    list = useRef(),
    results = searchDiagram(document, query);
  return (
    <div className="properties">
      <h2>Search diagram</h2>
      <label className="field">
        Find items and connections
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              list.current?.querySelector("button")?.focus();
            }
          }}
        />
      </label>
      <button onClick={onFit}>Fit selection</button>
      <p className="muted">
        {results.length} results. Arrow keys move between results; Enter focuses
        an item. Use Properties to edit the selection.
      </p>
      <div ref={list}>
        {results.map((result, index) => (
          <button
            className="search-result"
            key={`${result.kind}:${result.id}:${index}`}
            onClick={() => onFocus(result)}
            onKeyDown={(e) => {
              if (["ArrowDown", "ArrowUp"].includes(e.key)) {
                e.preventDefault();
                const buttons = list.current.querySelectorAll("button");
                buttons[
                  (index + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) %
                    buttons.length
                ]?.focus();
              }
            }}
          >
            <strong>{result.label}</strong>
            <span>
              {result.kind} · {result.id}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
