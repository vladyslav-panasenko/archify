// The editing canvas may use simpler routes than Archify. Keep automatic labels
// readable without changing authored labelAt or writing this placement to JSON.
export function automaticLabelPoint(point, label, boxes) {
  const halfWidth = Math.max(20, label.length * 2.8 + 7), halfHeight = 10;
  const overlaps = ([x, y], box) => x + halfWidth > box.pos[0] && x - halfWidth < box.pos[0] + box.size[0]
    && y + halfHeight > box.pos[1] && y - halfHeight < box.pos[1] + box.size[1];
  if (!boxes.some(box => overlaps(point, box))) return point;
  const candidates = boxes.flatMap(box => [
    [point[0], box.pos[1] - halfHeight - 4],
    [point[0], box.pos[1] + box.size[1] + halfHeight + 4],
    [box.pos[0] - halfWidth - 4, point[1]],
    [box.pos[0] + box.size[0] + halfWidth + 4, point[1]],
  ]).filter(candidate => !boxes.some(box => overlaps(candidate, box)));
  return candidates.sort((a,b) => Math.hypot(a[0]-point[0],a[1]-point[1]) - Math.hypot(b[0]-point[0],b[1]-point[1]))[0] || point;
}
