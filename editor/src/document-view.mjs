import { sourceNodes } from "./adapters/index.mjs";
export const viewStorageKey = "archify-document-views:v1";
export const viewKey = (session) => `${session.recoveryKey}:${session.name}`;
export function validView(value, document, panels) {
  const p = value?.viewport;
  if (
    !p ||
    ![p.x, p.y, p.zoom].every(Number.isFinite) ||
    Math.abs(p.x) > 1e7 ||
    Math.abs(p.y) > 1e7 ||
    p.zoom < 0.15 ||
    p.zoom > 3
  )
    return null;
  const ids = new Set(sourceNodes(document).map((n) => n.id));
  return {
    viewport: { x: p.x, y: p.y, zoom: p.zoom },
    selection: Array.isArray(value.selection)
      ? [...new Set(value.selection)].filter((id) => ids.has(id)).slice(0, 2000)
      : [],
    panel: panels.includes(value.panel) ? value.panel : "inspector",
  };
}
function entries(storage) {
  const raw = storage.getItem(viewStorageKey) || "[]";
  if (raw.length > 256 * 1024) return [];
  const value = JSON.parse(raw);
  return Array.isArray(value)
    ? value.filter((e) => typeof e?.key === "string" && e.view).slice(-50)
    : [];
}
export function readView(storage, key, document, panels) {
  try {
    return validView(
      entries(storage).find((e) => e.key === key)?.view,
      document,
      panels,
    );
  } catch {
    return null;
  }
}
export function writeView(storage, key, view, document, panels) {
  const valid = validView(view, document, panels);
  if (!valid) return false;
  try {
    let all = entries(storage).filter((e) => e.key !== key);
    all.push({ key, view: valid });
    all = all.slice(-50);
    while (JSON.stringify(all).length > 128 * 1024 && all.length > 1)
      all.shift();
    storage.setItem(viewStorageKey, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}
