import { clone, components, moveComponents } from "./document.mjs";
import { freshId } from "./topology.mjs";
export function boundaryBounds(document, boundary, pad = boundary.pad ?? 30) {
  if (!Number.isFinite(pad) || pad < 0 || pad > 1000)
    throw new Error("Use padding from 0 to 1,000.");
  const byId = new Map(components(document).map((c) => [c.id, c]));
  const members = boundary.wraps.map((id) => byId.get(id));
  if (!members.length || members.some((c) => !c))
    throw new Error("Choose existing boundary members.");
  const pos = [0, 1].map(
    (axis) => Math.min(...members.map((c) => c.pos[axis])) - pad,
  );
  const size = [0, 1].map(
    (axis) =>
      Math.max(...members.map((c) => c.pos[axis] + c.size[axis])) +
      pad -
      pos[axis] +
      (axis ? 20 : 0),
  );
  return { pos, size };
}
export function fitBoundary(document, index, pad) {
  const boundary = document.boundaries?.[index];
  if (!boundary) throw new Error("Select an existing boundary.");
  boundaryBounds(document, boundary, pad);
  return saveBoundary(document, index, { ...boundary, pad });
}
export function saveView(document, index, values) {
  const next = clone(document);
  next.meta.views ||= [];
  if (index === null && next.meta.views.length >= 5)
    throw new Error("A diagram supports up to five guided views.");
  if (
    !values.label.trim() ||
    values.label.length > 48 ||
    values.note?.length > 140
  )
    throw new Error(
      "Use a label of 1–48 characters and a note of at most 140 characters.",
    );
  const focus = [...new Set(values.focus)];
  if (
    !focus.length ||
    focus.some((id) => !next.components.some((c) => c.id === id))
  )
    throw new Error("Choose at least one existing component.");
  const value = {
    ...(index === null
      ? { id: freshId(next.meta.views, "view") }
      : next.meta.views[index]),
    ...values,
    focus,
  };
  if (index === null) next.meta.views.push(value);
  else next.meta.views[index] = value;
  return next;
}
export function deleteView(document, index) {
  const next = clone(document);
  next.meta.views.splice(index, 1);
  if (!next.meta.views.length) delete next.meta.views;
  return next;
}
export function saveBoundary(document, index, values) {
  const next = clone(document),
    wraps = [...new Set(values.wraps)];
  if (!values.label.trim() || !wraps.length)
    throw new Error("A boundary needs a label and at least one member.");
  if (wraps.some((id) => !next.components.some((c) => c.id === id)))
    throw new Error("Boundary references a missing component.");
  if (
    !["region", "security-group"].includes(values.kind) ||
    !Number.isFinite(values.pad) ||
    values.pad < 0
  )
    throw new Error("Choose a valid boundary kind and nonnegative padding.");
  next.boundaries ||= [];
  const item = { ...(next.boundaries[index] || {}), ...values, wraps };
  if (index === null) next.boundaries.push(item);
  else next.boundaries[index] = item;
  return next;
}
export function deleteBoundary(document, index) {
  const next = clone(document);
  next.boundaries.splice(index, 1);
  return next;
}
export function moveBoundary(document, index, dx, dy) {
  if (![dx, dy].every(Number.isFinite))
    throw new Error("Offsets must be finite.");
  const ids = document.boundaries[index].wraps;
  return moveComponents(
    document,
    new Map(
      components(document)
        .filter((c) => ids.includes(c.id))
        .map((c) => [c.id, [c.pos[0] + dx, c.pos[1] + dy]]),
    ),
  );
}

export function previewBoundaryMembership(document, movedDocument, ids) {
  if (document.diagram_type !== "architecture" || !document.boundaries?.length)
    return { document: movedDocument, changes: [] };
  const before = new Map(components(document).map((item) => [item.id, item]));
  const after = new Map(components(movedDocument).map((item) => [item.id, item]));
  const next = clone(movedDocument), changes = [];
  for (const [index, boundary] of document.boundaries.entries()) {
    const originalMembers = boundary.wraps.map((id) => before.get(id)).filter(Boolean), pad = boundary.pad ?? 30;
    const bounds = {
      left: Math.min(...originalMembers.map((item) => item.pos[0])) - pad,
      top: Math.min(...originalMembers.map((item) => item.pos[1])) - pad,
      right: Math.max(...originalMembers.map((item) => item.pos[0] + item.size[0])) + pad,
      bottom: Math.max(...originalMembers.map((item) => item.pos[1] + item.size[1])) + pad,
    };
    for (const id of ids) {
      const item = after.get(id); if (!item) continue;
      const inside = item.pos[0] + item.size[0] / 2 >= bounds.left && item.pos[0] + item.size[0] / 2 <= bounds.right && item.pos[1] + item.size[1] / 2 >= bounds.top && item.pos[1] + item.size[1] / 2 <= bounds.bottom;
      const member = boundary.wraps.includes(id);
      if (inside && !member) { next.boundaries[index].wraps.push(id); changes.push({ id, boundary: boundary.label, action: "add" }); }
      else if (!inside && member && next.boundaries[index].wraps.length > 1) { next.boundaries[index].wraps = next.boundaries[index].wraps.filter((value) => value !== id); changes.push({ id, boundary: boundary.label, action: "remove" }); }
    }
  }
  return { document: next, changes };
}
