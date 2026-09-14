const MAX_AGE = 7 * 24 * 60 * 60 * 1000, MAX_BYTES = 1024 * 1024;
export const savedHistoryPreferenceKey = "archify-saved-history-enabled:v1";
export function readSavedHistory(storage, key, revision, validate, now = Date.now()) {
  let value;
  try { value = JSON.parse(storage.getItem(`archify-saved-history:${key}`) || "null"); }
  catch { return null; }
  if (!value) return null;
  const invalid = value.version !== 1 || value.revision !== revision || !Number.isFinite(Date.parse(value.savedAt)) || now - Date.parse(value.savedAt) > MAX_AGE || !Array.isArray(value.historyData?.past) || !Array.isArray(value.historyData?.future) || value.historyData.past.length + value.historyData.future.length > 20 || JSON.stringify(value).length * 2 > MAX_BYTES;
  if (invalid) { storage.removeItem(`archify-saved-history:${key}`); return null; }
  try { for (const snapshot of [...value.historyData.past, ...value.historyData.future]) validate(snapshot); }
  catch { storage.removeItem(`archify-saved-history:${key}`); return null; }
  return value.historyData;
}
export function writeSavedHistory(storage, key, revision, historyData, now = new Date()) {
  const value = { version: 1, revision, savedAt: now.toISOString(), historyData: structuredClone(historyData) };
  if (historyData.past.length + historyData.future.length > 20 || JSON.stringify(value).length * 2 > MAX_BYTES)
    throw new Error("Saved history exceeds the 20-state or 1 MB limit.");
  storage.setItem(`archify-saved-history:${key}`, JSON.stringify(value));
}
