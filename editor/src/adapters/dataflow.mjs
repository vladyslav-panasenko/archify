export const dataflow = {
  nodesKey: "nodes",
  edgesKey: "flows",
  minSize: [48, 36],
  fields: ["stage", "row", "yOffset"],
  hint: "Horizontal dragging changes the stage. Vertical dragging changes the row and offset.",
  routes: [
    "auto",
    "straight",
    "vertical-channel",
    "bottom-channel",
    "top-channel",
  ],
  project(document, node) {
    const size = [node.width || 112, node.height || 58];
    return {
      ...node,
      size,
      pos: [
        100 + node.stage * 215 - size[0] / 2,
        128 + node.row * 114 + (node.yOffset || 0),
      ],
    };
  },
  move(document, node, [x, y]) {
    node.stage = Math.max(
      0,
      Math.min(
        document.stages.length - 1,
        Math.round((x + (node.width || 112) / 2 - 100) / 215),
      ),
    );
    node.row = Math.max(0, Math.min(4, Math.round((y - 128) / 114)));
    node.yOffset = Math.round((y - 128 - node.row * 114) * 100) / 100;
  },
  regions(document) {
    return document.stages.map((stage, index) => ({
      id: `stage:${index}`,
      label: stage.label,
      pos: [16 + index * 215, 46],
      size: [168, (document.meta.viewBox?.[1] || 720) - 120],
    }));
  },
  validate(document) {
    if (!document.stages?.length) throw new Error("Dataflow needs stages.");
    for (const node of document.nodes) {
      if (
        !Number.isInteger(node.stage) ||
        node.stage < 0 ||
        node.stage >= document.stages.length
      )
        throw new Error(`Unknown stage for ${node.id}.`);
      if (!Number.isInteger(node.row) || node.row < 0 || node.row > 4)
        throw new Error("Dataflow rows must be between 0 and 4.");
    }
  },
};
