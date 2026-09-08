import { clone, components, moveComponents } from "./document.mjs";
import { freshId } from "./topology.mjs";
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
