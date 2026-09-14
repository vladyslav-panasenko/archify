import { clone } from "./document.mjs";
import { sourceNodes, connections, nodeKey, edgeKey } from "./adapters/index.mjs";

const nodeFields = ["pos", "size", "row", "col", "stage", "lane", "yOffset"];
const edgeFields = ["via", "route", "fromSide", "toSide", "labelAt", "labelDx", "labelDy", "labelSegment"];

export function planRefinement(current, regenerated) {
  if (current?.diagram_type !== regenerated?.diagram_type || current?.schema_version !== regenerated?.schema_version) throw new Error("Refinement requires matching diagram type and schema version.");
  const currentNodes = new Map(sourceNodes(current).map((item) => [item.id, item]));
  const currentEdges = new Map(connections(current).filter((item) => item.id).map((item) => [item.id, item]));
  const operations = [];
  for (const item of sourceNodes(regenerated)) {
    const source = currentNodes.get(item.id); if (!source) continue;
    for (const field of nodeFields) if (source[field] !== undefined && JSON.stringify(source[field]) !== JSON.stringify(item[field])) operations.push({ kind: "item", id: item.id, field, value: structuredClone(source[field]) });
  }
  for (const item of connections(regenerated)) {
    const source = item.id && currentEdges.get(item.id); if (!source || source.from !== item.from || source.to !== item.to) continue;
    for (const field of edgeFields) if (source[field] !== undefined && JSON.stringify(source[field]) !== JSON.stringify(item[field])) operations.push({ kind: "connection", id: item.id, field, value: structuredClone(source[field]) });
  }
  return { format: "archify-refinement", version: 1, diagramType: current.diagram_type, schemaVersion: current.schema_version, operations };
}

export function applyRefinement(regenerated, proposal, selected = proposal.operations.map((_, index) => index)) {
  if (proposal?.format !== "archify-refinement" || proposal.version !== 1 || proposal.diagramType !== regenerated.diagram_type || proposal.schemaVersion !== regenerated.schema_version) throw new Error("Choose a compatible Archify refinement proposal.");
  const next = clone(regenerated), allowed = new Set(selected);
  proposal.operations.forEach((operation, index) => {
    if (!allowed.has(index)) return;
    const collection = operation.kind === "item" ? next[nodeKey(next)] : next[edgeKey(next)];
    const target = collection?.find((entry) => entry.id === operation.id);
    if (!target) throw new Error(`Refinement subject ${operation.id} no longer exists.`);
    target[operation.field] = structuredClone(operation.value);
  });
  return next;
}
