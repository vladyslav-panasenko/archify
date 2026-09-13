export const defaultShortcuts = Object.freeze({ commands: "Mod+K", save: "Mod+S", duplicate: "Mod+D", selectAll: "Mod+A", undo: "Mod+Z", redo: "Mod+Shift+Z" });
export function validateShortcuts(value) {
  const next = { ...defaultShortcuts, ...value }, seen = new Map();
  for (const [action, shortcut] of Object.entries(next)) {
    if (!/^Mod\+(?:Shift\+)?[A-Z]$/.test(shortcut)) throw new Error(`${action} must use Mod plus a letter, with optional Shift.`);
    if (seen.has(shortcut)) throw new Error(`${action} conflicts with ${seen.get(shortcut)} (${shortcut}).`);
    seen.set(shortcut, action);
  }
  return next;
}
export function readShortcuts(storage) {
  try { return validateShortcuts(JSON.parse(storage.getItem("archify-shortcuts:v1") || "{}")); }
  catch { return { ...defaultShortcuts }; }
}
export function matchesShortcut(event, shortcut) {
  const parts = shortcut.split("+"), key = parts.at(-1).toLowerCase();
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === key && event.shiftKey === parts.includes("Shift") && !event.altKey;
}
