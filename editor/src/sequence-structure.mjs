import { clone } from "./document.mjs";
import { freshId } from "./topology.mjs";
export function saveMessage(
  document,
  index,
  fields,
  acknowledgeRanges = false,
) {
  const next = clone(document),
    old = next.messages[index],
    y = Number(fields.y);
  if (
    !fields.label.trim() ||
    !Number.isFinite(y) ||
    y < 160 ||
    y > (next.meta.viewBox?.[1] || 760) - 83
  )
    throw new Error("Use a label and Y within the readable timeline.");
  if (
    !next.participants.some((p) => p.id === fields.from) ||
    !next.participants.some((p) => p.id === fields.to)
  )
    throw new Error("Choose existing participants.");
  if (next.messages.some((m, i) => i !== index && m.y === y))
    throw new Error("Choose a distinct message Y.");
  const ranges = [...(next.activations || []), ...(next.segments || [])];
  if (ranges.length && (!old || old.y !== y) && !acknowledgeRanges)
    throw new Error(
      "Confirm that activation and segment ranges retain their current Y coordinates.",
    );
  const message = {
    ...(old || { id: freshId(next.messages, "message") }),
    ...fields,
    y,
  };
  if (index === null) next.messages.push(message);
  else next.messages[index] = message;
  next.messages.sort((a, b) => a.y - b.y);
  return next;
}
export function removeMessage(document, index) {
  if (document.messages.length <= 1)
    throw new Error("Keep at least one message.");
  const next = clone(document);
  next.messages.splice(index, 1);
  return next;
}
export function saveRange(document, collection, index, fields) {
  if (!["segments", "activations"].includes(collection))
    throw new Error("Unknown range collection.");
  const next = clone(document),
    from = Number(fields.from),
    to = Number(fields.to);
  if (
    ![from, to].every(Number.isFinite) ||
    from < 72 ||
    to <= from ||
    to > (document.meta.viewBox?.[1] || 760) - 45
  )
    throw new Error(
      "Ranges must run from a smaller Y to a larger Y inside the timeline.",
    );
  if (
    collection === "activations" &&
    !document.participants.some((p) => p.id === fields.participant)
  )
    throw new Error("Choose an existing participant.");
  if (collection === "segments" && !fields.label?.trim())
    throw new Error("A segment label is required.");
  next[collection] ||= [];
  const value = { ...(next[collection][index] || {}), ...fields, from, to };
  if (index === null) next[collection].push(value);
  else next[collection][index] = value;
  return next;
}
export function removeRange(document, collection, index) {
  const next = clone(document);
  next[collection].splice(index, 1);
  return next;
}
