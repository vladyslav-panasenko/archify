import { components, moveComponents } from "./document.mjs";

export function autoLayout(document, ids, locked = []) {
  if (document.diagram_type !== "architecture")
    throw new Error("Auto-arrange supports architecture diagrams.");
  const selected = new Set(ids.filter((id) => !locked.includes(id)));
  const boxes = components(document),
    moving = boxes
      .filter((c) => selected.has(c.id))
      .sort((a, b) => a.id.localeCompare(b.id));
  if (!moving.length)
    throw new Error("Select at least one unlocked component.");
  const obstacles = boxes.filter((c) => !selected.has(c.id));
  const width = Math.max(...moving.map((c) => c.size[0])) + 60;
  const height = Math.max(...moving.map((c) => c.size[1])) + 60;
  const columns = Math.ceil(Math.sqrt(moving.length));
  const origin = [
    Math.max(20, Math.min(...moving.map((c) => c.pos[0]))),
    Math.max(60, Math.min(...moving.map((c) => c.pos[1]))),
  ];
  const positions = new Map();
  let cell = 0;
  for (const item of moving) {
    let pos;
    do {
      pos = [
        origin[0] + (cell % columns) * width,
        origin[1] + Math.floor(cell / columns) * height,
      ];
      cell++;
    } while (
      obstacles.some(
        (c) =>
          pos[0] < c.pos[0] + c.size[0] + 20 &&
          pos[0] + item.size[0] + 20 > c.pos[0] &&
          pos[1] < c.pos[1] + c.size[1] + 20 &&
          pos[1] + item.size[1] + 20 > c.pos[1],
      )
    );
    positions.set(item.id, pos);
  }
  return moveComponents(document, positions);
}
