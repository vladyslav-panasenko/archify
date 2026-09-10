import { components, moveComponents } from "./document.mjs";

export const arrangements = {
  left: "Align left",
  centerX: "Align horizontal centers",
  right: "Align right",
  top: "Align top",
  centerY: "Align vertical centers",
  bottom: "Align bottom",
  distributeX: "Distribute horizontally",
  distributeY: "Distribute vertically",
};

export function arrange(document, ids, action) {
  if (document.diagram_type !== "architecture")
    throw new Error("Free alignment is available for architecture diagrams.");
  if (!(action in arrangements)) throw new Error("Unknown arrangement.");
  const selected = components(document).filter((c) => ids.includes(c.id));
  const distribute = action.startsWith("distribute");
  if (selected.length < (distribute ? 3 : 2))
    throw new Error(
      distribute
        ? "Select at least three items."
        : "Select at least two items.",
    );
  const axis = ["top", "centerY", "bottom", "distributeY"].includes(action)
    ? 1
    : 0;
  const start = Math.min(...selected.map((c) => c.pos[axis]));
  const end = Math.max(...selected.map((c) => c.pos[axis] + c.size[axis]));
  const positions = new Map();
  if (distribute) {
    const ordered = selected.toSorted((a, b) => a.pos[axis] - b.pos[axis]);
    const gap =
      (end - start - selected.reduce((sum, c) => sum + c.size[axis], 0)) /
      (selected.length - 1);
    if (gap < 0)
      throw new Error(
        "Spread the outer items farther apart before distributing.",
      );
    let cursor = start;
    for (const c of ordered) {
      const p = [...c.pos];
      p[axis] = cursor;
      positions.set(c.id, p);
      cursor += c.size[axis] + gap;
    }
  } else {
    for (const c of selected) {
      const p = [...c.pos];
      p[axis] = action.startsWith("center")
        ? (start + end - c.size[axis]) / 2
        : ["right", "bottom"].includes(action)
          ? end - c.size[axis]
          : start;
      positions.set(c.id, p);
    }
  }
  return moveComponents(document, positions);
}

// Return a translation for the selection as a whole; never distort its spacing.
export function snapBox(
  box,
  others,
  { grid = 0, smart = true, threshold = 6, bypass = false } = {},
) {
  if (bypass) return { delta: [0, 0], guides: [] };
  const delta = [0, 0],
    guides = [];
  for (const axis of [0, 1]) {
    const anchors = [
      box.pos[axis],
      box.pos[axis] + box.size[axis] / 2,
      box.pos[axis] + box.size[axis],
    ];
    const candidates = [];
    if (smart) {
      for (const other of others)
        for (const target of [
          other.pos[axis],
          other.pos[axis] + other.size[axis] / 2,
          other.pos[axis] + other.size[axis],
        ]) {
          for (const anchor of anchors)
            candidates.push({
              shift: target - anchor,
              target,
              kind: "alignment",
            });
        }
      // Fit an item between two neighbors with equal clear space on either side.
      const cross = 1 - axis;
      const sorted = others.filter(other =>
        other.pos[cross] < box.pos[cross] + box.size[cross] &&
        other.pos[cross] + other.size[cross] > box.pos[cross]
      ).toSorted((a, b) => a.pos[axis] - b.pos[axis]);
      for (let i = 1; i < sorted.length; i++) {
        const left = sorted[i - 1].pos[axis] + sorted[i - 1].size[axis],
          right = sorted[i].pos[axis];
        if (right - left < box.size[axis]) continue;
        const target = (left + right - box.size[axis]) / 2;
        candidates.push({
          shift: target - box.pos[axis],
          target: target + box.size[axis] / 2,
          kind: "equal spacing",
        });
      }
    }
    const best = candidates
      .filter((c) => Math.abs(c.shift) <= threshold)
      .sort((a, b) => Math.abs(a.shift) - Math.abs(b.shift))[0];
    if (best) {
      delta[axis] = best.shift;
      guides.push({ axis, value: best.target, kind: best.kind });
    } else if (Number.isFinite(grid) && grid > 0)
      delta[axis] = Math.round(box.pos[axis] / grid) * grid - box.pos[axis];
  }
  return { delta, guides };
}

export function snapPositions(document, positions, settings) {
  const all = components(document),
    moving = all.filter((c) => positions.has(c.id));
  if (!moving.length || document.diagram_type !== "architecture")
    return { positions, guides: [] };
  const pos = [0, 1].map((axis) =>
    Math.min(...moving.map((c) => positions.get(c.id)[axis])),
  );
  const size = [0, 1].map(
    (axis) =>
      Math.max(...moving.map((c) => positions.get(c.id)[axis] + c.size[axis])) -
      pos[axis],
  );
  const { delta, guides } = snapBox(
    { pos, size },
    all.filter((c) => !positions.has(c.id)),
    settings,
  );
  return {
    positions: new Map(
      [...positions].map(([id, p]) => [id, p.map((n, i) => n + delta[i])]),
    ),
    guides,
  };
}

export function snapResize(document, id, rect, settings) {
  const all = components(document),
    original = all.find((c) => c.id === id);
  if (document.diagram_type !== "architecture") return { rect, guides: [] };
  const next = { ...rect },
    guides = [];
  for (const axis of [0, 1]) {
    const key = axis ? "y" : "x",
      dimension = axis ? "height" : "width";
    const leading = Math.abs(rect[key] - original.pos[axis]) > 0.01;
    if (!leading && Math.abs(rect[dimension] - original.size[axis]) < 0.01)
      continue;
    const point = [rect.x, rect.y];
    point[axis] = rect[key] + (leading ? 0 : rect[dimension]);
    const result = snapBox(
      { pos: point, size: [0, 0] },
      all.filter((c) => c.id !== id),
      settings,
    );
    const shift = result.delta[axis];
    if (leading) {
      next[key] += shift;
      next[dimension] -= shift;
    } else next[dimension] += shift;
    if (next[dimension] < (axis ? 24 : 40)) {
      next[key] = rect[key];
      next[dimension] = rect[dimension];
    } else guides.push(...result.guides.filter((g) => g.axis === axis));
  }
  return { rect: next, guides };
}
