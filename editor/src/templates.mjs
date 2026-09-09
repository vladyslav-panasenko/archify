import { copySelection, pasteSelection } from "./clipboard.mjs";
import { newDocument } from "./document.mjs";
export const templateKey = "archify-templates:v1";
export function checkTemplates(entries) {
  if (
    !Array.isArray(entries) ||
    entries.length > 20 ||
    JSON.stringify(entries).length * 2 > 2 * 1024 * 1024
  )
    throw new Error(
      "Templates are limited to 20 entries and 2 MB. Export and delete an entry first.",
    );
  const ids = new Set();
  for (const e of entries) {
    if (
      typeof e?.id !== "string" ||
      !e.id ||
      ids.has(e.id) ||
      typeof e.name !== "string" ||
      !e.name.trim() ||
      e.name.length > 80
    )
      throw new Error(
        "Invalid template names or IDs. Existing storage has been preserved.",
      );
    ids.add(e.id);
    pasteSelection(newDocument(), e.fragment);
  }
  return entries;
}
export function addTemplate(entries, name, fragment) {
  return checkTemplates([
    ...entries,
    {
      id: crypto.randomUUID(),
      name: name.trim(),
      fragment: structuredClone(fragment),
    },
  ]);
}
export function saveTemplate(entries, name, document, ids) {
  return addTemplate(entries, name, copySelection(document, ids));
}
export function renameTemplate(entries, id, name) {
  return checkTemplates(
    entries.map((e) => (e.id === id ? { ...e, name: name.trim() } : e)),
  );
}
export function exportTemplate(entry) {
  return {
    format: "archify-template",
    version: 1,
    name: entry.name,
    fragment: entry.fragment,
  };
}
export function importTemplate(entries, payload) {
  if (
    payload?.format !== "archify-template" ||
    payload.version !== 1 ||
    typeof payload.name !== "string"
  )
    throw new Error("Choose an Archify template export.");
  return addTemplate(entries, payload.name, payload.fragment);
}
