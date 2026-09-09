import {
  gridLayout,
  resolveComponentPos,
} from "../../archify/renderers/architecture/grid.mjs";
import {
  adapterFor,
  supportedTypes,
  sourceNodes,
  connections,
  nodeKey,
  edgeKey,
} from "./adapters/index.mjs";

export const serialize = (document) => JSON.stringify(document, null, 2) + "\n";
export const clone = (document) => structuredClone(document);
const point = (value) =>
  Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);

export function newDocument(title = "Untitled diagram") {
  return {
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title },
    components: [
      {
        id: "component-1",
        type: "backend",
        label: "Component 1",
        pos: [80, 120],
      },
    ],
    connections: [],
  };
}
function uniqueId(items, prefix) {
  let n = 1;
  const ids = new Set(items.map((item) => item.id));
  while (ids.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}
export function addComponent(document, { label, type = "backend" }) {
  if (!label.trim()) throw new Error("A label is required.");
  const next = clone(document),
    id = uniqueId(next.components, "component");
  next.components.push({
    id,
    type,
    label,
    pos: [
      80 + (next.components.length % 4) * 180,
      120 + Math.floor(next.components.length / 4) * 120,
    ],
  });
  return next;
}
export function addConnection(document, { from, to, label }) {
  if (
    !document.components.some((c) => c.id === from) ||
    !document.components.some((c) => c.id === to)
  )
    throw new Error("Choose both connection endpoints.");
  const next = clone(document);
  next.connections ||= [];
  next.connections.push({
    id: uniqueId(next.connections, "connection"),
    from,
    to,
    ...(label ? { label } : {}),
  });
  return next;
}
export function removeComponent(document, id) {
  if (document.components.length <= 1)
    throw new Error("Keep at least one component in the diagram.");
  const next = clone(document);
  next.components = next.components.filter((c) => c.id !== id);
  if (next.connections)
    next.connections = next.connections.filter(
      (c) => c.from !== id && c.to !== id,
    );
  if (next.boundaries)
    next.boundaries = next.boundaries
      .map((b) => ({ ...b, wraps: b.wraps.filter((member) => member !== id) }))
      .filter((b) => b.wraps.length);
  if (next.meta.views)
    next.meta.views = next.meta.views
      .map((v) => ({ ...v, focus: v.focus.filter((member) => member !== id) }))
      .filter((v) => v.focus.length);
  if (next.meta.views?.length === 0) delete next.meta.views;
  return next;
}
export function removeConnection(document, index) {
  const next = clone(document);
  next.connections.splice(index, 1);
  return next;
}
export function reconnectConnection(
  document,
  index,
  { from, to, fromSide, toSide },
) {
  if (document.diagram_type !== "architecture")
    throw new Error(
      "Endpoint editing currently supports architecture diagrams.",
    );
  if (
    !document.components.some((c) => c.id === from) ||
    !document.components.some((c) => c.id === to)
  )
    throw new Error("Choose existing endpoints.");
  const next = clone(document),
    edge = next.connections[index];
  if (!edge) throw new Error("Unknown connection.");
  Object.assign(edge, { from, to });
  if (fromSide !== undefined) edge.fromSide = fromSide;
  if (toSide !== undefined) edge.toSide = toSide;
  return next;
}

export function assertDocument(document) {
  if (!supportedTypes.includes(document?.diagram_type))
    throw new Error(
      `Unsupported diagram type. Supported: ${supportedTypes.join(", ")}.`,
    );
  if (
    !Array.isArray(document[nodeKey(document)]) ||
    !sourceNodes(document).length
  )
    throw new Error(
      `The diagram needs at least one item in ${nodeKey(document)}.`,
    );
  if (
    !document.meta ||
    typeof document.meta.title !== "string" ||
    !document.meta.title.trim()
  )
    throw new Error("The diagram needs a title.");
  for (const key of [
    nodeKey(document),
    edgeKey(document),
    "lanes",
    "boundaries",
  ]) {
    if (
      document[key] !== undefined &&
      (!Array.isArray(document[key]) ||
        document[key].some(
          (item) => !item || typeof item !== "object" || Array.isArray(item),
        ))
    )
      throw new Error(`${key} must contain objects.`);
  }
  for (const lane of document.lanes || [])
    if (!lane.id || document.lanes.filter((l) => l.id === lane.id).length > 1)
      throw new Error("Lane IDs must be present and unique.");
  const adapter = adapterFor(document);
  adapter?.validate(document);
  const ids = new Set();
  for (const component of sourceNodes(document)) {
    if (typeof component.id !== "string" || !component.id)
      throw new Error("Every component needs an ID.");
    if (component.pos !== undefined && !point(component.pos))
      throw new Error(`Invalid coordinates for ${component.id}.`);
    if (
      component.size !== undefined &&
      (!point(component.size) || component.size.some((n) => n <= 0))
    )
      throw new Error(`Invalid size for ${component.id}.`);
    if (component.yOffset !== undefined && !Number.isFinite(component.yOffset))
      throw new Error(`Invalid offset for ${component.id}.`);
    if (ids.has(component.id))
      throw new Error(`Duplicate component ID: ${component.id}`);
    ids.add(component.id);
    const pos = adapter
      ? adapter.project(document, component).pos
      : resolveComponentPos(component, gridLayout(document));
    if (!point(pos))
      throw new Error(
        `Component ${component.id} needs pos or valid grid row/col.`,
      );
  }
  const edgeIds = new Set();
  for (const edge of connections(document)) {
    if (edge.id !== undefined) {
      if (edgeIds.has(edge.id))
        throw new Error(`Duplicate connection ID: ${edge.id}`);
      edgeIds.add(edge.id);
    }
    if (edge.labelAt !== undefined && !point(edge.labelAt))
      throw new Error("Label placement needs two finite coordinates.");
    if (
      edge.via !== undefined &&
      (!Array.isArray(edge.via) || !edge.via.every(point))
    )
      throw new Error("Waypoints need pairs of finite coordinates.");
    if (!ids.has(edge.from) || !ids.has(edge.to))
      throw new Error(
        `Connection ${edge.from} → ${edge.to} references a missing component.`,
      );
  }
  for (const boundary of document.boundaries || []) {
    if (!Array.isArray(boundary.wraps) || !boundary.wraps.length)
      throw new Error("A boundary needs members.");
    if (boundary.wraps.some((id) => !ids.has(id)))
      throw new Error(
        `Boundary ${boundary.label} references a missing component.`,
      );
  }
  return document;
}

// Documents are immutable history snapshots. Weak keys release old projections
// when their snapshots leave history.
const projections = new WeakMap();
export function components(document) {
  if (projections.has(document)) return projections.get(document);
  const result = projectComponents(document);
  projections.set(document, result);
  return result;
}
function projectComponents(document) {
  const adapter = adapterFor(document);
  if (adapter)
    return sourceNodes(document).map((node) => adapter.project(document, node));
  const grid = gridLayout(document);
  return document.components.map((c) => ({
    ...c,
    pos: resolveComponentPos(c, grid),
    size: c.size || [120, 60],
  }));
}

export function patchComponent(document, id, patch) {
  const next = clone(document);
  const adapter = adapterFor(document);
  const item = sourceNodes(next).find((c) => c.id === id);
  if (!item) throw new Error(`Unknown component: ${id}`);
  for (const key of Object.keys(patch)) {
    if (adapter?.patchNode?.(next, item, key, patch[key])) continue;
    if (adapter && key === "pos") {
      if (!point(patch.pos))
        throw new Error("Coordinates must contain two finite numbers.");
      adapter.move(next, item, patch.pos);
      continue;
    }
    if (adapter && key === "size") {
      if (adapter.resizable === false)
        throw new Error("This diagram type does not support individual sizes.");
      if (
        !point(patch.size) ||
        !patch.size.every(
          (n, i) => Number.isFinite(n) && n >= adapter.minSize[i],
        )
      )
        throw new Error(`Minimum size: ${adapter.minSize.join(" × ")}.`);
      [item.width, item.height] = patch.size;
      continue;
    }
    if (adapter && (adapter.fields.includes(key) || key === "lane")) {
      if (
        key === "col" &&
        (!Number.isInteger(patch[key]) ||
          patch[key] < 0 ||
          patch[key] >= adapter.columns)
      )
        throw new Error("Column is outside the supported range.");
      if (key === "lane" && !next.lanes.some((l) => l.id === patch[key]))
        throw new Error("Unknown lane.");
      item[key] = patch[key];
      continue;
    }
    if (!["pos", "size", "label", "sublabel", "tag"].includes(key))
      throw new Error(`Unsupported component edit: ${key}`);
    if (patch[key] === undefined) delete item[key];
    else item[key] = patch[key];
  }
  if (item.pos && !point(item.pos))
    throw new Error("Coordinates must be finite numbers.");
  if (item.size && (!point(item.size) || !item.size.every((n) => n > 0)))
    throw new Error("Size must contain positive numbers.");
  adapter?.validate(next);
  if (item.yOffset !== undefined && !Number.isFinite(item.yOffset))
    throw new Error("Offset must be finite.");
  return next;
}

export function patchConnection(document, index, patch) {
  if (
    patch.via !== undefined &&
    (!Array.isArray(patch.via) || !patch.via.every(point))
  )
    throw new Error("Waypoints need pairs of finite coordinates.");
  if (patch.labelAt !== undefined && !point(patch.labelAt))
    throw new Error("Label placement needs two finite coordinates.");
  for (const key of ["labelDx", "labelDy"])
    if (patch[key] !== undefined && !Number.isFinite(patch[key]))
      throw new Error("Label offset must be finite.");
  const next = clone(document);
  const item = connections(next)[index];
  if (!item) throw new Error("Unknown connection.");
  if (adapterFor(document)?.patchConnection) {
    adapterFor(document).patchConnection(next, index, patch);
    return next;
  }
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
  if (document.diagram_type === "architecture") {
    return {
      ...document,
      components: document.components.map((c) => {
        const pos = positions.get(c.id);
        if (!pos) return c;
        if (!point(pos)) throw new Error("Coordinates must be finite numbers.");
        return { ...c, pos: pos.map((n) => Math.round(n * 100) / 100) };
      }),
    };
  }
  const next = clone(document);
  const adapter = adapterFor(document);
  for (const c of [...sourceNodes(next)]) {
    const pos = positions.get(c.id);
    if (pos) {
      if (!point(pos)) throw new Error("Coordinates must be finite numbers.");
      if (adapter) adapter.move(next, c, pos);
      else c.pos = pos.map((n) => Math.round(n * 100) / 100);
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
