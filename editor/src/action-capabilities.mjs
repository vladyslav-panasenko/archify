import { sourceNodes } from "./adapters/index.mjs";
export function actionCapabilities({ document, selection, locked = [], busy = false, rawDirty = false }) {
  const unavailable = busy || rawDirty, architecture = document?.diagram_type === "architecture", lockedSelection = selection.some((id) => locked.includes(id));
  return {
    duplicate: { enabled: !!document && !!selection.length && !unavailable, reason: unavailable ? "Finish the current edit before duplicating." : "Select one or more items." },
    connect: { enabled: architecture && selection.length > 0 && !unavailable, reason: architecture ? "Select a source component." : "Direct canvas connection authoring is available for architecture diagrams." },
    arrange: { enabled: architecture && selection.length > 0 && !unavailable, reason: architecture ? "Select components to arrange." : "Free-coordinate arrangement is available for architecture diagrams." },
    deleteSelection: { enabled: architecture && selection.length > 0 && !unavailable && !lockedSelection && selection.length < sourceNodes(document).length, reason: lockedSelection ? "Unlock selected items before deleting." : "Keep at least one supported component." },
  };
}
