import { checkTemplates } from "./templates.mjs";
import { createDiagram } from "./topology.mjs";

export const packsKey = "archify-packs:v1";
export function checkPack(pack) {
  if (pack?.format !== "archify-diagram-pack" || pack.version !== 1 || typeof pack.id !== "string" || !/^[a-z0-9][a-z0-9.-]{1,63}$/.test(pack.id) || typeof pack.name !== "string" || !Array.isArray(pack.starters) || pack.starters.length > 20 || !Array.isArray(pack.templates) || typeof pack.terms !== "object" || Array.isArray(pack.terms)) throw new Error("Invalid Archify diagram pack version 1.");
  if (JSON.stringify(pack).length > 2 * 1024 * 1024) throw new Error("Diagram packs are limited to 2 MB.");
  for (const starter of pack.starters) if (typeof starter?.name !== "string" || !starter.document?.diagram_type) throw new Error("A diagram-pack starter is invalid.");
  checkTemplates(pack.templates);
  for (const [key, value] of Object.entries(pack.terms)) if (typeof key !== "string" || typeof value !== "string" || value.length > 120) throw new Error("Diagram-pack terminology is invalid.");
  return structuredClone(pack);
}

export function installPack(packs, incoming, replace = false) {
  const pack = checkPack(incoming), duplicate = packs.find((entry) => entry.id === pack.id);
  if (duplicate && !replace) throw Object.assign(new Error("A pack with this ID already exists. Choose replace to continue."), { collision: pack.id });
  return [...packs.filter((entry) => entry.id !== pack.id), pack].map(checkPack);
}

const pack = (id, name, terms, definitions) => checkPack({ format: "archify-diagram-pack", version: 1, id, name, terms, templates: [], starters: definitions.map(([type, title]) => ({ name: title, document: createDiagram(type, title) })) });
export const builtInPacks = [
  pack("software-delivery", "Software delivery", { component: "Service", connection: "Dependency", boundary: "Ownership boundary" }, [["architecture", "Service landscape"], ["workflow", "Release workflow"]]),
  pack("data-platform", "Data platform", { component: "Data product", connection: "Data movement", stage: "Processing stage" }, [["dataflow", "Data product flow"], ["sequence", "Ingestion exchange"]]),
  pack("incident-response", "Incident response", { component: "Responder system", connection: "Escalation", lane: "Response owner" }, [["lifecycle", "Incident lifecycle"], ["workflow", "Incident response workflow"]]),
];
