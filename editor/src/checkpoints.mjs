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
