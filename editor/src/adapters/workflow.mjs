export const workflow = {
  nodesKey: 'nodes', edgesKey: 'edges', minSize: [32, 32], columns: 6,
  routes: ['auto', 'straight', 'drop', 'outside-right', 'return-left', 'bottom-channel', 'up-channel'],
  fields: ['col', 'yOffset'],
  regions(document) { return document.lanes.map((lane, index) => ({ id: `lane:${index}`, label: lane.label, pos: [50, 90 + index * 180], size: [1220, 160] })); },
  project(document, node) {
    const lane = document.lanes.findIndex(l => l.id === node.lane);
    return { ...node, pos: [80 + node.col * 200, 120 + lane * 180 + (node.yOffset || 0)], size: [node.width || 140, node.height || 64] };
  },
  move(document, node, [x, y]) {
    node.col = Math.max(0, Math.min(5, Math.round((x - 80) / 200)));
    node.yOffset = Math.round((y - 120 - document.lanes.findIndex(l => l.id === node.lane) * 180) * 100) / 100;
  },
  validate(document) {
    if (!document.lanes?.length) throw new Error('Workflow needs lanes.');
    for (const node of document.nodes) if (!document.lanes.some(l => l.id === node.lane)) throw new Error(`Unknown lane for ${node.id}.`);
  },
};
