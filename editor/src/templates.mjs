import { copySelection } from "./clipboard.mjs";
import { pasteSelection } from "./clipboard.mjs";
import { createDiagram } from "./topology.mjs";
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
      e.name.length > 80 ||
      (e.category !== undefined && (typeof e.category !== "string" || e.category.length > 40)) ||
      e.fragment?.format !== "archify-selection" ||
      ![1, 2].includes(e.fragment.version) ||
      !Array.isArray(e.fragment.components) || !e.fragment.components.length ||
      !Array.isArray(e.fragment.connections)
    )
      throw new Error(
        "Invalid template names or IDs. Existing storage has been preserved.",
      );
    ids.add(e.id);
  }
  return entries;
}
export function addTemplate(entries, name, fragment, category = "", replace = false) {
  const duplicate = entries.find((entry) => entry.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase() && (entry.category || "") === category.trim());
  if (duplicate && !replace) throw Object.assign(new Error("A template with that name and category already exists. Choose replace to continue."), { collision: duplicate.id });
  return checkTemplates([
    ...entries.filter((entry) => entry.id !== duplicate?.id),
    {
      id: duplicate?.id || crypto.randomUUID(),
      name: name.trim(),
      ...(category.trim() ? { category: category.trim() } : {}),
      fragment: structuredClone(fragment),
    },
  ]);
}
export function saveTemplate(entries, name, document, ids, category = "") {
  return addTemplate(entries, name, copySelection(document, ids), category);
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
    ...(entry.category ? { category: entry.category } : {}),
    fragment: entry.fragment,
  };
}
export function importTemplate(entries, payload, replace = false) {
  if (
    payload?.format !== "archify-template" ||
    payload.version !== 1 ||
    typeof payload.name !== "string"
  )
    throw new Error("Choose an Archify template export.");
  return addTemplate(entries, payload.name, payload.fragment, payload.category || "", replace);
}
export const exportTemplateLibrary = (entries) => ({ format: "archify-template-library", version: 1, exportedAt: new Date().toISOString(), templates: structuredClone(checkTemplates(entries)) });
export function importTemplateLibrary(entries, payload, replace = false) {
  if (payload?.format !== "archify-template-library" || payload.version !== 1 || !Array.isArray(payload.templates)) throw new Error("Choose an Archify template library version 1.");
  let next = entries;
  for (const entry of checkTemplates(payload.templates)) next = addTemplate(next, entry.name, entry.fragment, entry.category || "", replace);
  return next;
}
export function templateValidationDocument(fragment) {
  const document = createDiagram(fragment.diagram_type, "Template validation");
  const lanes = fragment.dependencies?.lanes || [];
  if (lanes.length) {
    document.lanes = lanes.map((id) => ({ id, label: id }));
    for (const node of document.nodes || document.states || []) node.lane = lanes[0];
  }
  while ((document.stages?.length || 0) <= (fragment.dependencies?.highestStage ?? -1)) document.stages.push({ label: `Stage ${document.stages.length + 1}` });
  return pasteSelection(document, fragment).document;
}
