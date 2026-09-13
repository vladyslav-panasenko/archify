import { clone, components } from "./document.mjs";
import { connections } from "./adapters/index.mjs";

function crosses(segment, box, padding = 10) {
  const [[x1, y1], [x2, y2]] = segment;
  const left = box.pos[0] - padding, right = box.pos[0] + box.size[0] + padding,
    top = box.pos[1] - padding, bottom = box.pos[1] + box.size[1] + padding;
  if (x1 === x2) return x1 > left && x1 < right && Math.max(y1, y2) > top && Math.min(y1, y2) < bottom;
  if (y1 === y2) return y1 > top && y1 < bottom && Math.max(x1, x2) > left && Math.min(x1, x2) < right;
  return true;
}
export function routeAroundObstacles(document, index) {
  if (document.diagram_type !== "architecture") throw new Error("Obstacle routing currently uses architecture coordinate fields.");
  const edge = connections(document)[index];
  if (!edge) throw new Error("Choose a connection to route.");
  if (edge.via?.length || (edge.route && edge.route !== "auto"))
    throw new Error("This connection has a manual route. Reset its route before automatic obstacle routing.");
  const boxes = components(document), from = boxes.find((box) => box.id === edge.from), to = boxes.find((box) => box.id === edge.to);
  const obstacles = boxes.filter((box) => ![edge.from, edge.to].includes(box.id));
  const start = [from.pos[0] + from.size[0] / 2, from.pos[1] + from.size[1] / 2],
    end = [to.pos[0] + to.size[0] / 2, to.pos[1] + to.size[1] / 2],
    xs = obstacles.flatMap((box) => [box.pos[0] - 20, box.pos[0] + box.size[0] + 20]),
    ys = obstacles.flatMap((box) => [box.pos[1] - 20, box.pos[1] + box.size[1] + 20]);
  const candidates = [
    [[(start[0] + end[0]) / 2, start[1]], [(start[0] + end[0]) / 2, end[1]]],
    [[start[0], (start[1] + end[1]) / 2], [end[0], (start[1] + end[1]) / 2]],
    ...ys.sort((a, b) => a - b).map((y) => [[start[0], y], [end[0], y]]),
    ...xs.sort((a, b) => a - b).map((x) => [[x, start[1]], [x, end[1]]),
  ];
  const scored = candidates.map((via) => {
    const points = [start, ...via, end], segments = points.slice(1).map((point, i) => [points[i], point]);
    return { via, blocked: segments.some((segment) => obstacles.some((box) => crosses(segment, box))), length: segments.reduce((sum, [[x1, y1], [x2, y2]]) => sum + Math.abs(x2 - x1) + Math.abs(y2 - y1), 0) };
  }).filter((candidate) => !candidate.blocked).sort((a, b) => a.length - b.length || JSON.stringify(a.via).localeCompare(JSON.stringify(b.via)));
  if (!scored.length) throw new Error(`No bounded route was found around ${obstacles.length} boxes. Move an obstacle, simplify the selection, or author waypoints manually.`);
  const next = clone(document);
  next.connections[index].route = "auto";
  next.connections[index].via = scored[0].via.filter((point, i, all) => i === 0 || point[0] !== all[i - 1][0] || point[1] !== all[i - 1][1]);
  return next;
}
