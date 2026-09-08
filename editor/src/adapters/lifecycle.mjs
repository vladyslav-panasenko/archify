function band(lane) {
  return lane === "main"
    ? { xs: [94, 248, 402, 556, 710], y: 126, size: [118, 62] }
    : lane === "terminal"
      ? { xs: [402, 556, 710], y: 450, size: [118, 58] }
      : { xs: [402, 556, 710], y: 278, size: [126, 58] };
}
export const lifecycle = {
  nodesKey: "states",
  edgesKey: "transitions",
  minSize: [48, 36],
  columns: 5,
  fields: ["col", "yOffset"],
  hint: "Drag horizontally between columns. Vertical dragging adjusts the offset; lane membership stays unchanged. Event lanes share a band.",
  routes: [
    "auto",
    "straight",
    "drop",
    "bottom-channel",
    "top-channel",
    "right-channel",
    "left-channel",
  ],
  project(document, node) {
    const b = band(node.lane),
      size = [node.width || b.size[0], node.height || b.size[1]];
    return {
      ...node,
      size,
      pos: [
        (b.xs[node.col] ?? b.xs.at(-1)) - size[0] / 2,
        b.y + (node.yOffset || 0),
      ],
    };
  },
  move(document, node, [x, y]) {
    const b = band(node.lane),
      center = x + (node.width || b.size[0]) / 2;
    node.col = b.xs.reduce(
      (best, value, index) =>
        Math.abs(value - center) < Math.abs(b.xs[best] - center) ? index : best,
      0,
    );
    node.yOffset = Math.round((y - b.y) * 100) / 100;
  },
  regions(document) {
    return ["main", "event", "terminal"]
      .map((key) => {
        const lanes = document.lanes.filter((l) =>
          key === "event" ? !["main", "terminal"].includes(l.id) : l.id === key,
        );
        return {
          id: `band:${key}`,
          label: lanes.map((l) => l.label).join(" / "),
          pos: [20, band(key).y - 25],
          size: [800, 120],
        };
      })
      .filter((region) => region.label);
  },
  validate(document) {
    if (!document.lanes?.length) throw new Error("Lifecycle needs lanes.");
    for (const node of document.states) {
      if (!document.lanes.some((l) => l.id === node.lane))
        throw new Error(`Unknown lane for ${node.id}.`);
      if (!Number.isInteger(node.col) || node.col < 0 || node.col > 4)
        throw new Error("Lifecycle columns must be between 0 and 4.");
    }
  },
};
