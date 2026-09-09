import React, { useEffect, useRef, useState } from "react";
export default function CommandMenu({ commands, onClose }) {
  const dialog = useRef(),
    input = useRef(),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const results = commands.filter((c) =>
    `${c.label} ${c.group || ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    input.current.focus();
    return () => previous?.isConnected && previous.focus();
  }, []);
  const run = (command) => {
    if (command && !command.disabled) {
      onClose();
      command.run();
    }
  };
  useEffect(() => {
    dialog.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, query]);
  return (
    <dialog
      ref={dialog}
      className="command-menu"
      aria-label="Editor commands"
      onCancel={onClose}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setActive((i) =>
            Math.max(
              0,
              Math.min(
                results.length - 1,
                i + (e.key === "ArrowDown" ? 1 : -1),
              ),
            ),
          );
        }
        if (e.key === "Enter" && e.target === input.current) {
          e.preventDefault();
          run(results[active]);
        }
      }}
    >
      <div className="command-heading">
        <h2>Commands</h2>
        <button onClick={onClose}>Close commands</button>
      </div>
      <label className="field">
        Find command
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          aria-describedby="command-help"
        />
      </label>
      <p id="command-help">
        Arrow keys choose a command; Enter runs it; Escape closes.
      </p>
      <div className="command-results">
        {results.map((command, i) => (
          <button
            key={command.id}
            disabled={command.disabled}
            aria-current={i === active ? "true" : undefined}
            onClick={() => run(command)}
          >
            {command.label}
            <small>
              {command.group}
              {command.shortcut ? ` · ${command.shortcut}` : ""}
              {command.disabled ? " · unavailable" : ""}
            </small>
          </button>
        ))}
        {!results.length && <p>No matching commands.</p>}
      </div>
    </dialog>
  );
}
