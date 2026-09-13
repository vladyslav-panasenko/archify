export const checkpointLimit = 10,
  checkpointBytes = 2 * 1024 * 1024;
export function addCheckpoint(existing, name, document, limit = checkpointLimit) {
  if (!name.trim() || name.trim().length > 80)
    throw new Error("Use a checkpoint name between 1 and 80 characters.");
  if (!Number.isInteger(limit) || limit < 1 || limit > checkpointLimit)
    throw new Error("Checkpoint retention must be between 1 and 10.");
  if (existing.length >= limit)
    throw new Error(
      `${limit} checkpoints already exist. Export and delete one before adding another.`,
    );
  const next = [
    ...existing,
    {
      id: crypto.randomUUID(),
      name: name.trim(),
      created: new Date().toISOString(),
      document: structuredClone(document),
    },
  ];
  if (JSON.stringify(next).length * 2 > checkpointBytes)
    throw new Error(
      "Checkpoints exceed the 2 MB local storage limit. Export and delete an older checkpoint first.",
    );
  return next;
}
export function readCheckpoints(storage, key) {
  const value = JSON.parse(storage.getItem(key) || "[]");
  if (
    !Array.isArray(value) ||
    value.some((c) => !c.id || !c.name || !c.created || !c.document)
  )
    throw new Error(
      "Stored checkpoints could not be read. Existing storage has been preserved.",
    );
  return value;
}
export function exportCheckpointBundle(entries) {
  return { format: "archify-recovery", version: 1, exportedAt: new Date().toISOString(), checkpoints: structuredClone(entries) };
}
export function exportRecoveryBundle({ document, historyData, checkpoints, includeHistory = true }) {
  const bundle = {
    format: "archify-recovery",
    version: 2,
    exportedAt: new Date().toISOString(),
    privacy: "Contains diagram content and local checkpoint labels. Review before sharing.",
    draft: { document: structuredClone(document), ...(includeHistory && historyData ? { historyData: structuredClone(historyData) } : {}) },
    checkpoints: structuredClone(checkpoints),
  };
  if (JSON.stringify(bundle).length * 2 > checkpointBytes)
    throw new Error("Portable recovery bundle exceeds 2 MB. Export fewer checkpoints or omit history.");
  return bundle;
}
export function importCheckpointBundle(existing, bundle, replace = false) {
  if (bundle?.format !== "archify-recovery" || ![1, 2].includes(bundle.version) || !Array.isArray(bundle.checkpoints))
    throw new Error("Choose an Archify recovery bundle version 1 or 2.");
  const incoming = bundle.checkpoints;
  readCheckpoints({ getItem: () => JSON.stringify(incoming) }, "bundle");
  const ids = new Set(existing.map((entry) => entry.id));
  const collisions = incoming.filter((entry) => ids.has(entry.id));
  if (collisions.length && !replace)
    throw Object.assign(new Error(`${collisions.length} checkpoint IDs already exist. Choose replace to continue.`), { collisions: collisions.map((entry) => entry.id) });
  const next = [...existing.filter((entry) => !incoming.some((value) => value.id === entry.id)), ...structuredClone(incoming)];
  if (next.length > checkpointLimit || JSON.stringify(next).length * 2 > checkpointBytes)
    throw new Error("Imported recovery exceeds the 10 checkpoint / 2 MB limit.");
  return next;
}
