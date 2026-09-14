import { newDocument } from "./document.mjs";

const cleanId = (value) => value.replace(/[^A-Za-z0-9_-]/g, "-").replace(/^-+|-+$/g, "") || "node";
const labelText = (value = "") => value.replace(/^[[({]+|[\])}]+$/g, "").trim().replace(/^"|"$/g, "");

export function importMermaid(text) {
  if (typeof text !== "string" || text.length > 1024 * 1024) throw new Error("Mermaid input is limited to 1 MB.");
  const lines = text.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("%%"));
  if (!/^flowchart\s+(TD|TB|LR|RL|BT)$/i.test(lines.shift() || "")) throw new Error("Only Mermaid flowchart TD, TB, LR, RL, or BT is supported.");
  const nodes = new Map(), edges = [], losses = [];
  const ensure = (raw, label = raw) => { const id = cleanId(raw); if (!nodes.has(id)) nodes.set(id, { id, type: "backend", label: labelText(label) || id }); return id; };
  for (const line of lines) {
    const edge = line.match(/^([A-Za-z0-9_.-]+)(?:([[(]{1,2}.*?[\])]{1,2}))?\s*(-->|---|-.->|==>)\s*(?:\|([^|]*)\|\s*)?([A-Za-z0-9_.-]+)(?:([[(]{1,2}.*?[\])]{1,2}))?$/);
    const node = line.match(/^([A-Za-z0-9_.-]+)(?:([[(]{1,2}.*?[\])]{1,2}))$/);
    if (edge) {
      const from = ensure(edge[1], edge[2] || edge[1]), to = ensure(edge[5], edge[6] || edge[5]);
      edges.push({ id: `connection-${edges.length + 1}`, from, to, ...(edge[4]?.trim() ? { label: edge[4].trim() } : {}), ...(edge[3] !== "-->" ? { variant: edge[3] === "-.->" ? "dashed" : "neutral" } : {}) });
    } else if (node) ensure(node[1], node[2]);
    else losses.push({ line, reason: "Unsupported Mermaid statement" });
  }
  if (!nodes.size) throw new Error("The Mermaid flowchart contains no supported nodes.");
  const document = newDocument("Imported Mermaid flowchart");
  document.components = [...nodes.values()].map((node, index) => ({ ...node, pos: [80 + (index % 4) * 200, 100 + Math.floor(index / 4) * 130] }));
  document.connections = edges;
  return { document, losses };
}

const quote = (text) => JSON.stringify(String(text)).replaceAll("\\n", " ");
export function exportMermaid(document) {
  if (document?.diagram_type !== "architecture") throw new Error("Mermaid export currently supports architecture diagrams.");
  const lines = ["flowchart LR", ...document.components.map((item) => `  ${cleanId(item.id)}[${quote(item.label)}]`), ...(document.connections || []).map((edge) => `  ${cleanId(edge.from)} -->${edge.label ? `|${edge.label.replaceAll("|", "/")}|` : ""} ${cleanId(edge.to)}`)];
  const losses = [];
  if (document.boundaries?.length) losses.push({ field: "boundaries", reason: "Mermaid subset does not preserve Archify boundaries." });
  if (document.cards?.length) losses.push({ field: "cards", reason: "Mermaid subset does not preserve cards." });
  for (const field of ["repository", "views", "viewBox"]) if (document.meta?.[field] !== undefined) losses.push({ field: `meta.${field}`, reason: "Not represented in Mermaid flowchart output." });
  if ((document.connections || []).some((edge) => edge.via || edge.route || edge.labelAt || edge.fromSide || edge.toSide)) losses.push({ field: "connections.routing", reason: "Authored routing and label placement are omitted." });
  return { text: lines.join("\n") + "\n", losses };
}
