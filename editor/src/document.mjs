import {
  gridLayout,
  resolveComponentPos,
} from "../../archify/renderers/architecture/grid.mjs";

export const serialize = (document) => JSON.stringify(document, null, 2) + "\n";
export const clone = (document) => structuredClone(document);

export function assertDocument(document) {
  if (document?.diagram_type !== "architecture")
    throw new Error(
      "This editor supports architecture diagrams. Open an architecture JSON file.",
    );
  if (!Array.isArray(document.components) || !document.components.length)
    throw new Error("The diagram needs at least one component.");
  const ids = new Set();
  for (const component of document.components) {
    if (ids.has(component.id))
      throw new Error(`Duplicate component ID: ${component.id}`);
    ids.add(component.id);
    const pos = resolveComponentPos(component, gridLayout(document));
    if (!pos.every(Number.isFinite))
      throw new Error(
        `Component ${component.id} needs pos or valid grid row/col.`,
      );
  }
  for (const edge of document.connections || []) {
    if (!ids.has(edge.from) || !ids.has(edge.to))
      throw new Error(
        `Connection ${edge.from} → ${edge.to} references a missing component.`,
      );
  }
  for (const boundary of document.boundaries || []) {
    if (boundary.wraps.some((id) => !ids.has(id)))
      throw new Error(
        `Boundary ${boundary.label} references a missing component.`,
      );
  }
  return document;
}

export function components(document) {
  const grid = gridLayout(document);
  return document.components.map((c) => ({
    ...c,
    pos: resolveComponentPos(c, grid),
    size: c.size || [120, 60],
  }));
}

export function patchComponent(document, id, patch) {
  const next = clone(document);
  const item = next.components.find((c) => c.id === id);
  if (!item) throw new Error(`Unknown component: ${id}`);
  for (const key of Object.keys(patch)) {
    if (!["pos", "size", "label", "sublabel", "tag"].includes(key))
      throw new Error(`Unsupported component edit: ${key}`);
    if (patch[key] === undefined) delete item[key];
    else item[key] = patch[key];
  }
  if (item.pos && !item.pos.every(Number.isFinite))
    throw new Error("Coordinates must be finite numbers.");
  if (item.size && !item.size.every((n) => Number.isFinite(n) && n > 0))
    throw new Error("Size must contain positive numbers.");
  return next;
}

export function patchConnection(document, index, patch) {
  const next = clone(document);
  const item = next.connections?.[index];
  if (!item) throw new Error("Unknown connection.");
  for (const key of Object.keys(patch)) {
    if (
      ![
        "label",
        "via",
        "labelAt",
        "labelDx",
        "labelDy",
        "route",
        "fromSide",
        "toSide",
      ].includes(key)
    )
      throw new Error(`Unsupported connection edit: ${key}`);
    if (patch[key] === undefined) delete item[key];
    else item[key] = patch[key];
  }
  return next;
}

export function moveComponents(document, positions) {
  const next = clone(document);
  for (const c of next.components) {
    const pos = positions.get(c.id);
    if (pos) {
      if (!pos.every(Number.isFinite))
        throw new Error("Coordinates must be finite numbers.");
      c.pos = pos.map((n) => Math.round(n * 100) / 100);
    }
  }
  return next;
}

export function history(document) {
  return { past: [], present: document, future: [] };
}
export function commit(state, document) {
  if (serialize(state.present) === serialize(document)) return state;
  return {
    past: [...state.past, state.present].slice(-100),
    present: document,
    future: [],
  };
}
export function undo(state) {
  if (!state.past.length) return state;
  return {
    past: state.past.slice(0, -1),
    present: state.past.at(-1),
    future: [state.present, ...state.future],
  };
}
export function redo(state) {
  if (!state.future.length) return state;
  return {
    past: [...state.past, state.present],
    present: state.future[0],
    future: state.future.slice(1),
  };
}

export function layoutWarnings(document) {
  const items = components(document),
    warnings = [];
  for (let i = 0; i < items.length; i++) {
    const a = items[i],
      [x, y] = a.pos,
      [w, h] = a.size;
    if (
      x < 0 ||
      y < 0 ||
      (document.meta.viewBox &&
        (x + w > document.meta.viewBox[0] || y + h > document.meta.viewBox[1]))
    )
      warnings.push(`${a.label} extends outside the canvas bounds.`);
    for (const b of items.slice(i + 1))
      if (
        x < b.pos[0] + b.size[0] &&
        x + w > b.pos[0] &&
        y < b.pos[1] + b.size[1] &&
        y + h > b.pos[1]
      )
        warnings.push(`${a.label} overlaps ${b.label}.`);
  }
  return warnings;
}
