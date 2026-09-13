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

export function planSequenceRange(document, { from, to, delta, mode }) {
  if (document.diagram_type !== "sequence" || !["shift", "duplicate"].includes(mode))
    throw new Error("Choose a sequence range operation.");
  [from, to, delta] = [from, to, delta].map(Number);
  if (![from, to, delta].every(Number.isFinite) || from > to || delta === 0)
    throw new Error("Use a valid inclusive range and a non-zero shift.");
  const selected = document.messages.filter((message) => message.y >= from && message.y <= to);
  if (!selected.length) throw new Error("The selected range contains no messages.");
  const rangeEntries = ["activations", "segments"].flatMap((collection) =>
    (document[collection] || []).map((entry, index) => ({ collection, index, entry })),
  );
  const partial = rangeEntries.find(({ entry }) => entry.to >= from && entry.from <= to && !(entry.from >= from && entry.to <= to));
  if (partial)
    throw new Error(`The range cuts through a ${partial.collection.slice(0, -1)}. Expand the range to include it completely.`);
  const contained = rangeEntries.filter(({ entry }) => entry.from >= from && entry.to <= to);
  const height = document.meta.viewBox?.[1] || 760;
  const movedYs = selected.map((message) => message.y + delta);
  if (movedYs.some((y) => y < 160 || y > height - 83))
    throw new Error("The result would place messages outside the readable timeline.");
  const selectedIds = new Set(selected.map((message) => message.id));
  const outsideYs = new Set(document.messages.filter((message) => !selectedIds.has(message.id)).map((message) => message.y));
  if (movedYs.some((y) => outsideYs.has(y)) || (mode === "duplicate" && movedYs.some((y) => document.messages.some((message) => message.y === y))))
    throw new Error("The result would overlap an existing message time.");
  const next = clone(document);
  if (mode === "shift") {
    for (const message of next.messages) if (selectedIds.has(message.id)) message.y += delta;
    for (const { collection, index } of contained) {
      next[collection][index].from += delta; next[collection][index].to += delta;
    }
  } else {
    for (const message of selected) next.messages.push({ ...clone(message), id: freshId(next.messages, "message"), y: message.y + delta });
    for (const { collection, entry } of contained) {
      next[collection] ||= [];
      next[collection].push({ ...clone(entry), from: entry.from + delta, to: entry.to + delta });
    }
  }
  next.messages.sort((a, b) => a.y - b.y);
  return { document: next, summary: `${mode === "shift" ? "Move" : "Duplicate"} ${selected.length} messages and ${contained.length} complete dependent ranges by ${delta}px.` };
}
