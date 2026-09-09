import { patchConnection } from "./document.mjs";
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
