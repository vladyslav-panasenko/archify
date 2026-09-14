import { clone } from "./document.mjs";

export function migrateArchitectureToV2(document) {
  if (document?.diagram_type !== "architecture" || document.schema_version !== 1) throw new Error("Choose an architecture version 1 document.");
  const next = clone(document); next.schema_version = 2;
  return { document: next, original: clone(document), changes: ["schema_version: 1 → 2"], note: "Migration enables persisted component ports. It does not infer or add ports." };
}

export function addPort(document, componentId, { id, side = "right", offset = 0.5, label = "" }) {
  if (document?.diagram_type !== "architecture" || document.schema_version !== 2) throw new Error("Persisted ports require architecture version 2.");
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id || "") || !["top", "right", "bottom", "left"].includes(side) || !Number.isFinite(Number(offset)) || Number(offset) < 0 || Number(offset) > 1) throw new Error("Ports need a unique ID, side, and offset from 0 to 1.");
  const next = clone(document), component = next.components.find((entry) => entry.id === componentId);
  if (!component) throw new Error("Choose an existing component.");
  if (next.components.some((entry) => entry.ports?.some((port) => port.id === id))) throw new Error("Port IDs must be unique in the document.");
  component.ports = [...(component.ports || []), { id, side, offset: Number(offset), ...(label.trim() ? { label: label.trim() } : {}) }];
  return next;
}

export function removePort(document, portId) {
  const next = clone(document);
  for (const component of next.components) { if (component.ports) { component.ports = component.ports.filter((port) => port.id !== portId); if (!component.ports.length) delete component.ports; } }
  for (const edge of next.connections || []) { if (edge.fromPort === portId) delete edge.fromPort; if (edge.toPort === portId) delete edge.toPort; }
  return next;
}
