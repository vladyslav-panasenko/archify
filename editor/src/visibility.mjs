import { sourceNodes, connections } from "./adapters/index.mjs";
export function visibleNodeIds(document, filter, selection = []) {
  const nodes = sourceNodes(document), query = filter.text.trim().toLowerCase();
  let visible = nodes.filter((node) => (!filter.type || node.type === filter.type) && (!query || `${node.id} ${node.label || ""} ${node.sublabel || ""} ${node.tag || ""}`.toLowerCase().includes(query)));
  if (filter.neighbors && selection.length) {
    const neighborhood = new Set(selection);
    for (const edge of connections(document))
      if (selection.includes(edge.from) || selection.includes(edge.to)) { neighborhood.add(edge.from); neighborhood.add(edge.to); }
    visible = visible.filter((node) => neighborhood.has(node.id));
  }
  return new Set(visible.map((node) => node.id));
}
