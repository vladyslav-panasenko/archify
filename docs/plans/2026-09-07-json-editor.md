# JSON-first Visual Editor Implementation Plan

**Goal:** Edit architecture diagrams visually and save valid Archify JSON for the existing compiler.

**Architecture:** React Flow owns the interactive canvas. An adapter patches the original JSON rather than serializing React Flow state. A loopback Node server provides schema validation, revision-checked saving of an explicitly opened file, and isolated Archify HTML generation.

**Tech Stack:** React, React Flow MIT core, Vite, Node built-ins, Node test runner, Playwright.

---

1. Add `editor/src/document.mjs` and `editor/test/document.test.mjs`: test preservation of metadata, grid overrides, routes and immutable history; implement coordinate/size updates against the source document.
2. Add `editor/server.mjs` and server tests: validate with existing standalone validators, serve one optional CLI-selected file, reject stale saves, write atomically, render to a temporary directory with fixed paths and no remote brand capture.
3. Add `editor/src/main.jsx` and `style.css`: document toolbar, React Flow canvas, component/connection inspector, JSON panel, keyboard editing, undo/redo, import/download and strict HTML rendering feedback.
4. Run `npm test`, `npm run build`, and browser tests from `editor`. Exercise actual drag, save/reopen, metadata preservation, validation errors and viewport containment.
5. Update the original plan and add usage documentation. Keep upstream compiler behavior unchanged. Exact editor/HTML appearance parity is explicitly not required; JSON preservation and compiler compatibility are required.

Visual direction: a quiet desktop drafting surface with a dominant light canvas, compact dark toolbar, component list, and selected-item inspector. A restrained teal selection color identifies editable state; type colors distinguish component roles. The primary actions are open, edit, save JSON, and render HTML. Inspector fields provide keyboard alternatives to gestures. No marketing surface or decorative metrics.
