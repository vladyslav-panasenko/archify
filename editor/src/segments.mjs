import { patchConnection } from "./document.mjs";
export function simplifyRoute(document, index, mode = "simplify") {
  if (document.diagram_type !== "architecture" || !document.connections[index])
    throw new Error("Select an architecture connection.");
  if (!["simplify", "straight"].includes(mode))
    throw new Error("Unknown route operation.");
  if (mode === "straight")
    return patchConnection(document, index, {
      via: undefined,
      route: "straight",
    });
  const via = [];
  for (const point of document.connections[index].via || []) {
    if (via.length && point.every((v, i) => v === via.at(-1)[i])) continue;
    while (via.length >= 2) {
      const a = via.at(-2),
        b = via.at(-1);
      const cross =
        (b[0] - a[0]) * (point[1] - b[1]) - (b[1] - a[1]) * (point[0] - b[0]);
      const forward =
        (b[0] - a[0]) * (point[0] - b[0]) + (b[1] - a[1]) * (point[1] - b[1]);
      if (cross !== 0 || forward < 0) break;
      via.pop();
    }
    via.push([...point]);
  }
  return patchConnection(document, index, {
    via: via.length ? via : undefined,
  });
}
export function routeSegments(edge) {
  const via = edge?.via || [];
  return via.slice(0, -1).flatMap((a, index) => {
    const b = via[index + 1];
    if (a[0] === b[0] && a[1] === b[1]) return [];
    if (a[0] !== b[0] && a[1] !== b[1]) return [];
    return [
      {
        index,
        axis: a[1] === b[1] ? 1 : 0,
        orientation: a[1] === b[1] ? "horizontal" : "vertical",
        point: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      },
    ];
  });
}
export function moveSegment(document, edgeIndex, index, point) {
  if (document.diagram_type !== "architecture")
    throw new Error("Segment editing supports architecture routes.");
  if (
    !Array.isArray(point) ||
    point.length !== 2 ||
    !point.every(Number.isFinite)
  )
    throw new Error("Segment coordinates must be finite.");
  const edge = document.connections[edgeIndex],
    segment = routeSegments(edge).find((s) => s.index === index);
  if (!segment)
    throw new Error(
      "Choose a horizontal or vertical segment between two authored waypoints.",
    );
  return patchConnection(document, edgeIndex, {
    via: edge.via.map((p, i) =>
      i === index || i === index + 1
        ? p.map((n, axis) => (axis === segment.axis ? point[axis] : n))
        : p,
    ),
  });
}
