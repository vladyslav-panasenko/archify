export const checkpointLimit = 10,
  checkpointBytes = 2 * 1024 * 1024;
export function addCheckpoint(existing, name, document) {
  if (!name.trim() || name.trim().length > 80)
    throw new Error("Use a checkpoint name between 1 and 80 characters.");
  if (existing.length >= checkpointLimit)
    throw new Error(
      "Ten checkpoints already exist. Export and delete one before adding another.",
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
export function importCheckpointBundle(existing, bundle, replace = false) {
  if (bundle?.format !== "archify-recovery" || bundle.version !== 1 || !Array.isArray(bundle.checkpoints))
    throw new Error("Choose an Archify recovery bundle version 1.");
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
