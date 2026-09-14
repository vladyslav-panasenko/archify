import { sourceNodes, connections } from "./adapters/index.mjs";

export const commentsVersion = 1;
export const commentsKey = (identity) => `archify-comments:v1:${identity}`;
const limit = 200;

export function subjectExists(document, subject) {
  if (subject?.kind === "document") return true;
  if (subject?.kind === "item") return sourceNodes(document).some((item) => item.id === subject.id);
  if (subject?.kind === "connection") return connections(document).some((item) => item.id === subject.id);
  return false;
}

export function checkComments(record, document) {
  if (record?.version !== commentsVersion || !Array.isArray(record.comments) || record.comments.length > limit)
    throw new Error("Comments must be an Archify comments version 1 record with at most 200 entries.");
  const ids = new Set();
  return { version: commentsVersion, comments: record.comments.map((entry) => {
    if (typeof entry?.id !== "string" || !entry.id || ids.has(entry.id) || typeof entry.text !== "string" || !entry.text.trim() || entry.text.length > 2000 || !["document", "item", "connection"].includes(entry.subject?.kind) || (entry.subject.kind !== "document" && (typeof entry.subject.id !== "string" || !entry.subject.id)))
      throw new Error("A comment has an invalid ID, subject, or body.");
    ids.add(entry.id);
    return { ...structuredClone(entry), orphaned: !subjectExists(document, entry.subject) };
  }) };
}

export function addComment(record, document, subject, text, author = "Local reviewer") {
  const current = checkComments(record || { version: 1, comments: [] }, document);
  if (!subjectExists(document, subject)) throw new Error("Choose an existing document subject.");
  const entry = { id: crypto.randomUUID(), subject: structuredClone(subject), text: text.trim(), author: author.trim() || "Local reviewer", createdAt: new Date().toISOString(), resolvedAt: null };
  return checkComments({ version: 1, comments: [...current.comments, entry] }, document);
}

export function resolveComment(record, document, id, resolved = true) {
  return checkComments({ version: 1, comments: record.comments.map((entry) => entry.id === id ? { ...entry, resolvedAt: resolved ? new Date().toISOString() : null } : entry) }, document);
}
