import { clone, assertDocument } from "./document.mjs";
import { connections } from "./adapters/index.mjs";
export function internalConnectionIndices(document, ids) {
  const selected = new Set(ids);
  return connections(document).map((edge, index) => selected.has(edge.from) && selected.has(edge.to) ? index : -1).filter((index) => index >= 0);
}
export function commonConnectionValue(document, indices, field) {
  const values = indices.map((index) => connections(document)[index]?.[field]);
  return values.every((value) => JSON.stringify(value) === JSON.stringify(values[0])) ? values[0] : undefined;
}
export function bulkPatchConnections(document, indices, patch) {
  if (!indices.length) throw new Error("Select at least two endpoints with an internal connection.");
  const next = clone(document), edges = connections(next);
  for (const index of indices) {
    if (!edges[index]) throw new Error("Connection selection changed. Select the endpoints again.");
    for (const [key, value] of Object.entries(patch)) {
      if (!["label", "route", "fromSide", "toSide", "variant"].includes(key)) throw new Error("Unsupported shared connection property.");
      if (value === "") delete edges[index][key]; else edges[index][key] = value;
    }
  }
  assertDocument(next);
  return next;
}
