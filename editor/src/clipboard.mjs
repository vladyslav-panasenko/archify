import { clone, components, assertDocument } from "./document.mjs";
export function copySelection(document, ids) {
  if (document.diagram_type !== "architecture")
    throw new Error("Copy and paste currently support architecture diagrams.");
  const nodes = components(document).filter((c) => ids.includes(c.id));
  if (!nodes.length) throw new Error("Select components to copy.");
  return {
    format: "archify-selection",
    version: 1,
    diagram_type: document.diagram_type,
    components: clone(nodes),
    connections: clone(
      (document.connections || []).filter(
        (e) => ids.includes(e.from) && ids.includes(e.to),
      ),
    ),
  };
}
export function pasteSelection(document, payload, offset = 24) {
  if (
    payload?.format !== "archify-selection" ||
    payload.version !== 1 ||
    payload.diagram_type !== document.diagram_type ||
    document.diagram_type !== "architecture"
  )
    throw new Error("Paste requires a compatible architecture selection.");
  if (
    !Array.isArray(payload.components) ||
    !payload.components.length ||
    !Array.isArray(payload.connections)
  )
    throw new Error("Invalid selection data.");
  assertDocument({
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title: "Clipboard" },
    components: payload.components,
    connections: payload.connections,
  });
  const next = clone(document),
    used = new Set(
      [...next.components, ...(next.connections || [])].map((c) => c.id),
    ),
    mapping = new Map();
  const idFor = (id) => {
    let n = 1;
    while (used.has(`${id}-copy-${n}`)) n++;
    const value = `${id}-copy-${n}`;
    used.add(value);
    return value;
  };
  for (const c of payload.components) mapping.set(c.id, idFor(c.id));
  next.components.push(
    ...clone(payload.components).map((c) => ({
      ...c,
      id: mapping.get(c.id),
      pos: c.pos.map((n) => n + offset),
    })),
  );
  next.connections ||= [];
  next.connections.push(
    ...clone(payload.connections).map((e) => ({
      ...e,
      ...(e.id ? { id: idFor(e.id) } : {}),
      from: mapping.get(e.from),
      to: mapping.get(e.to),
      ...(e.via ? { via: e.via.map((p) => p.map((n) => n + offset)) } : {}),
      ...(e.labelAt ? { labelAt: e.labelAt.map((n) => n + offset) } : {}),
    })),
  );
  return { document: next, ids: [...mapping.values()] };
}
