import {
  clone,
  patchComponent,
  components,
  removeComponent,
} from "./document.mjs";
import { sourceNodes, connections } from "./adapters/index.mjs";
export function resetFields(document, ids, kind, index = null) {
  const next = clone(document),
    removed = [];
  const clear = (item, keys, label) => {
    for (const key of keys)
      if (Object.hasOwn(item, key)) {
        delete item[key];
        removed.push(`${label}.${key}`);
      }
  };
  if (index !== null) {
    if (document.diagram_type === "sequence")
      throw new Error("Sequence message Y is required and cannot be reset.");
    const edge = connections(next)[index];
    if (!edge) throw new Error("Select a connection.");
    clear(
      edge,
      kind === "label"
        ? ["labelAt", "labelDx", "labelDy"]
        : kind === "route"
          ? ["via"]
          : [],
      edge.id || `connection ${index + 1}`,
    );
  } else {
    for (const item of sourceNodes(next).filter((c) => ids.includes(c.id))) {
      if (document.diagram_type === "architecture") {
        if (
          kind === "position" &&
          next.layout &&
          Number.isInteger(item.row) &&
          Number.isInteger(item.col)
        )
          clear(item, ["pos"], item.id);
        if (kind === "size") clear(item, ["size"], item.id);
      } else if (document.diagram_type !== "sequence")
        clear(
          item,
          kind === "position"
            ? ["yOffset"]
            : kind === "size"
              ? ["width", "height"]
              : [],
          item.id,
        );
    }
  }
  return { document: next, removed };
}
export function commonValue(document, ids, field) {
  const values = components(document)
    .filter((c) => ids.includes(c.id))
    .map((c) =>
      field === "width"
        ? c.size[0]
        : field === "height"
          ? c.size[1]
          : (c[field] ?? ""),
    );
  return values.every((v) => JSON.stringify(v) === JSON.stringify(values[0]))
    ? values[0]
    : undefined;
}
export function bulkPatch(document, ids, field, value) {
  if (!["label", "sublabel", "width", "height"].includes(field))
    throw new Error("Unsupported bulk property.");
  if (field === "label" && !value.trim())
    throw new Error("A label cannot be empty.");
  let next = clone(document);
  for (const c of components(document).filter((c) => ids.includes(c.id)))
    next = patchComponent(
      next,
      c.id,
      field === "width" || field === "height"
        ? { size: field === "width" ? [value, c.size[1]] : [c.size[0], value] }
        : { [field]: value },
    );
  return next;
}
export function deletionSummary(document, ids) {
  return `${document.components.filter((c) => ids.includes(c.id)).length} components, ${(document.connections || []).filter((e) => ids.includes(e.from) || ids.includes(e.to)).length} connections, ${(document.boundaries || []).filter((b) => b.wraps.some((id) => ids.includes(id))).length} affected boundaries and ${(document.meta.views || []).filter((v) => v.focus.some((id) => ids.includes(id))).length} affected views`;
}
export function removeSelection(document, ids) {
  if (document.diagram_type !== "architecture")
    throw new Error("Bulk deletion currently supports architecture diagrams.");
  const existing = ids.filter((id) =>
    document.components.some((c) => c.id === id),
  );
  if (new Set(existing).size >= document.components.length)
    throw new Error("Keep at least one component in the diagram.");
  return [...new Set(existing)].reduce(
    (next, id) => removeComponent(next, id),
    document,
  );
}
