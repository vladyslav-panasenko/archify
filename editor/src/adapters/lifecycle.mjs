const automatic = () => {
  throw new Error("Lifecycle v3 geometry is automatic. Edit states, transitions, or mainPath instead.");
};
const layouts = new WeakMap();
function layout(document) {
  if (layouts.has(document)) return layouts.get(document);
  const positions = new Map((document.mainPath || []).map((id, index) => [id, [56 + index * 220, 80]]));
  const adjacent = new Map(document.states.map((node) => [node.id, []]));
  for (const edge of document.transitions) {
    adjacent.get(edge.from)?.push(edge.to);
    adjacent.get(edge.to)?.push(edge.from);
  }
  const queue = [...positions.keys()], occupied = new Map();
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index], [x, y] = positions.get(id);
    for (const other of adjacent.get(id) || []) {
      if (positions.has(other)) continue;
      const row = Math.round((y - 80) / 150) + 1;
      const column = Math.max(Math.round((x - 56) / 220), occupied.get(row) || 0);
      occupied.set(row, column + 1);
      positions.set(other, [56 + column * 220, 80 + row * 150]);
      queue.push(other);
    }
  }
  for (const node of document.states) if (!positions.has(node.id)) positions.set(node.id, [56 + positions.size * 220, 230]);
  layouts.set(document, positions);
  return positions;
}
export const lifecycle = {
  nodesKey: "states",
  edgesKey: "transitions",
  minSize: [140, 64],
  fields: [],
  movable: false,
  resizable: false,
  routes: [],
  hint: "Lifecycle v3 uses automatic geometry. This canvas is a schematic topology preview; Render shows the authoritative layout. Edit the main path and connections in Structure.",
  project(document, node) {
    return { ...node, size: [180, 64], pos: layout(document).get(node.id) };
  },
  move: automatic,
  regions: () => [],
  patchNode(document, node, key, value) {
    if (["pos", "size", "col", "lane", "yOffset", "width", "height"].includes(key)) automatic();
    if (["type", "step"].includes(key)) {
      if (value === undefined) delete node[key];
      else node[key] = value;
      return true;
    }
    return false;
  },
  patchConnection(document, index, patch) {
    const edge = document.transitions[index];
    for (const [key, value] of Object.entries(patch)) {
      if (!["label", "note", "variant"].includes(key)) automatic();
      if (value === undefined) delete edge[key];
      else edge[key] = value;
    }
  },
  validate(document) {
    if (document.schema_version !== 3)
      throw new Error("Lifecycle v1/v2 is unsupported by Archify 3.1.0. Convert a copy explicitly to lifecycle v3; opening and saving never migrate it.");
    const ids = new Set(document.states.map((node) => node.id));
    const main = document.mainPath;
    if (!Array.isArray(main) || main.length < 2 || new Set(main).size !== main.length || main.some((id) => !ids.has(id)))
      throw new Error("Lifecycle mainPath needs at least two distinct existing states.");
    for (let index = 1; index < main.length; index++)
      if (!document.transitions.some((edge) => edge.from === main[index - 1] && edge.to === main[index]))
        throw new Error(`Lifecycle mainPath needs a transition from ${main[index - 1]} to ${main[index]}.`);
    if (document.lanes || document.states.some((node) => ["lane", "col", "yOffset", "pos", "size", "width", "height"].some((key) => node[key] !== undefined)))
      throw new Error("Lifecycle v3 does not support authored lanes or geometry.");
    if (document.transitions.some((edge) => ["route", "via", "labelAt", "labelDx", "labelDy", "fromSide", "toSide"].some((key) => edge[key] !== undefined)))
      throw new Error("Lifecycle v3 does not support authored routing or label positions.");
  },
};
