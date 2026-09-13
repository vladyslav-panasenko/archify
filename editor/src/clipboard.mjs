import { clone, assertDocument } from "./document.mjs";
import { sourceNodes, connections, nodeKey, edgeKey } from "./adapters/index.mjs";

export function copySelection(document, ids) {
  const selected = new Set(ids), nodes = sourceNodes(document).filter((node) => selected.has(node.id));
  if (!nodes.length) throw new Error("Select items to copy.");
  const internal = connections(document).filter((edge) => selected.has(edge.from) && selected.has(edge.to));
  const external = connections(document).filter((edge) => selected.has(edge.from) !== selected.has(edge.to));
  return {
    format: "archify-selection",
    version: 2,
    diagram_type: document.diagram_type,
    components: clone(nodes),
    connections: clone(internal),
    boundaries: clone((document.boundaries || []).filter((boundary) => boundary.wraps.every((id) => selected.has(id)))),
    dependencies: {
      lanes: [...new Set(nodes.map((node) => node.lane).filter(Boolean))],
      highestStage: Math.max(-1, ...nodes.map((node) => node.stage).filter(Number.isInteger)),
      omittedExternalConnections: external.length,
    },
  };
}

function shifted(node, type, offset) {
  const next = clone(node);
  if (Array.isArray(next.pos)) next.pos = next.pos.map((value) => value + offset);
  else if (["workflow", "lifecycle"].includes(type) && Number.isInteger(next.col)) next.col += 1;
  else if (type === "dataflow" && Number.isInteger(next.row)) next.row += 1;
  return next;
}

export function pasteSelection(document, payload, offset = 24) {
  if (payload?.format !== "archify-selection" || ![1, 2].includes(payload.version) || payload.diagram_type !== document.diagram_type)
    throw new Error("Paste requires a compatible Archify selection from the same diagram type.");
  if (!Array.isArray(payload.components) || !payload.components.length || !Array.isArray(payload.connections))
    throw new Error("Invalid selection data.");
  if (payload.version === 1 && document.diagram_type !== "architecture")
    throw new Error("This legacy selection supports architecture diagrams only.");
  const lanes = new Set((document.lanes || []).map((lane) => lane.id));
  for (const lane of payload.dependencies?.lanes || [])
    if (!lanes.has(lane)) throw new Error(`Paste needs lane “${lane}”. Add or map that lane before retrying.`);
  if ((payload.dependencies?.highestStage ?? -1) >= (document.stages?.length ?? Infinity))
    throw new Error("Paste needs source stage positions that this dataflow does not have.");

  const next = clone(document), used = new Set([...sourceNodes(next), ...connections(next)].map((item) => item.id).filter(Boolean)), mapping = new Map();
  const idFor = (id) => {
    let number = 1;
    while (used.has(`${id}-copy-${number}`)) number++;
    const value = `${id}-copy-${number}`;
    used.add(value); return value;
  };
  for (const node of payload.components) mapping.set(node.id, idFor(node.id));
  next[nodeKey(next)].push(...payload.components.map((node) => ({ ...shifted(node, document.diagram_type, offset), id: mapping.get(node.id) })));
  next[edgeKey(next)] ||= [];
  next[edgeKey(next)].push(...clone(payload.connections).map((edge) => ({
    ...edge,
    ...(edge.id ? { id: idFor(edge.id) } : {}),
    from: mapping.get(edge.from), to: mapping.get(edge.to),
    ...(edge.via ? { via: edge.via.map((point) => point.map((value) => value + offset)) } : {}),
    ...(edge.labelAt ? { labelAt: edge.labelAt.map((value) => value + offset) } : {}),
    ...(document.diagram_type === "sequence" && Number.isFinite(edge.y) ? { y: edge.y + offset } : {}),
  })));
  if (payload.boundaries?.length) {
    next.boundaries ||= [];
    next.boundaries.push(...clone(payload.boundaries).map((boundary) => ({
      ...boundary,
      ...(boundary.id ? { id: idFor(boundary.id) } : {}),
      wraps: boundary.wraps.map((id) => mapping.get(id)),
    })));
  }
  assertDocument(next);
  return { document: next, ids: [...mapping.values()], omittedExternalConnections: payload.dependencies?.omittedExternalConnections || 0 };
}
