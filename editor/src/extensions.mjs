import { clone } from "./document.mjs";

export const extensionKey = "archify-extensions:v1";
export const extensionGrantsKey = "archify-extension-grants:v1";
const allowedPermissions = new Set(["document:write", "templates:write"]);
const pointerParts = (pointer) => {
  if (!/^\/(schema_version|diagram_type|meta|components|connections|nodes|edges|stages|flows|states|transitions|participants|messages|lanes|boundaries)(\/|$)/.test(pointer)) throw new Error(`Extension path is outside the document contract: ${pointer}`);
  const parts = pointer.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  if (parts.some((part) => ["__proto__", "prototype", "constructor"].includes(part))) throw new Error("Extension path contains an unsafe property.");
  return parts;
};

export function checkExtension(manifest) {
  if (manifest?.format !== "archify-extension" || manifest.version !== 1 || typeof manifest.id !== "string" || !/^[a-z0-9][a-z0-9.-]{1,63}$/.test(manifest.id) || typeof manifest.name !== "string" || !manifest.name.trim() || !Array.isArray(manifest.permissions) || manifest.permissions.some((permission) => !allowedPermissions.has(permission)) || !Array.isArray(manifest.commands) || manifest.commands.length > 20 || (manifest.diagramTypes !== undefined && (!Array.isArray(manifest.diagramTypes) || manifest.diagramTypes.some((type) => !["architecture", "workflow", "dataflow", "lifecycle", "sequence"].includes(type)))) || (manifest.adapters !== undefined && (!Array.isArray(manifest.adapters) || manifest.adapters.length > 10)))
    throw new Error("Invalid Archify extension version 1 manifest.");
  for (const command of manifest.commands) {
    if (typeof command?.id !== "string" || typeof command.label !== "string" || !Array.isArray(command.operations) || command.operations.length > 100) throw new Error("Invalid extension command.");
    for (const operation of command.operations) {
      if (!["set", "remove"].includes(operation?.op) || typeof operation.path !== "string") throw new Error("Extension operations must be set or remove JSON-pointer operations.");
      pointerParts(operation.path);
    }
  }
  for (const adapter of manifest.adapters || []) {
    if (typeof adapter?.id !== "string" || typeof adapter.label !== "string" || !["architecture", "workflow", "dataflow", "lifecycle", "sequence"].includes(adapter.from) || !["architecture", "workflow", "dataflow", "lifecycle", "sequence"].includes(adapter.to) || !Array.isArray(adapter.operations) || adapter.operations.length > 100) throw new Error("Invalid extension schema adapter.");
    for (const operation of adapter.operations) { if (!["set", "remove"].includes(operation?.op) || typeof operation.path !== "string") throw new Error("Schema adapter operations must be set or remove JSON-pointer operations."); pointerParts(operation.path); }
  }
  if (JSON.stringify(manifest).length > 256 * 1024) throw new Error("Extension manifests are limited to 256 KB.");
  return structuredClone(manifest);
}

export function runExtensionCommand(manifest, commandId, document, grants = []) {
  const checked = checkExtension(manifest), command = checked.commands.find((entry) => entry.id === commandId);
  if (!command) throw new Error("Unknown extension command.");
  for (const permission of checked.permissions) if (!grants.includes(permission)) throw new Error(`Extension permission not granted: ${permission}`);
  if (!checked.permissions.includes("document:write")) throw new Error("Command cannot change the document without document:write.");
  if (checked.diagramTypes?.length && !checked.diagramTypes.includes(document.diagram_type)) throw new Error("Extension command does not support this diagram type.");
  const next = clone(document);
  for (const operation of command.operations) {
    const parts = pointerParts(operation.path); let parent = next;
    for (const part of parts.slice(0, -1)) { if (!parent || typeof parent !== "object" || !(part in parent)) throw new Error(`Extension path does not exist: ${operation.path}`); parent = parent[part]; }
    const key = parts.at(-1); if (operation.op === "remove") { if (Array.isArray(parent)) parent.splice(Number(key), 1); else delete parent[key]; } else parent[key] = structuredClone(operation.value);
  }
  return next;
}

export function runExtensionAdapter(manifest, adapterId, document, grants = []) {
  const checked = checkExtension(manifest), adapter = (checked.adapters || []).find((entry) => entry.id === adapterId);
  if (!adapter) throw new Error("Unknown extension schema adapter.");
  if (document.diagram_type !== adapter.from) throw new Error(`Schema adapter requires ${adapter.from} input.`);
  const synthetic = { ...checked, diagramTypes: [adapter.from], commands: [{ id: adapter.id, label: adapter.label, operations: adapter.operations }] };
  const next = runExtensionCommand(synthetic, adapter.id, document, grants);
  if (next.diagram_type !== adapter.to) throw new Error(`Schema adapter must produce ${adapter.to} output.`);
  return next;
}
