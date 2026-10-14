import { assertCompatibility, clone, newDocument } from "./document.mjs";
import {
  adapterFor,
  sourceNodes,
  connections,
  nodeKey,
  edgeKey,
} from "./adapters/index.mjs";
export const authoringTypes = [
  "architecture",
  "workflow",
  "dataflow",
  "lifecycle",
  "sequence",
];
export const stateKinds = [
  "start",
  "active",
  "waiting",
  "decision",
  "success",
  "failure",
  "neutral",
  "external",
];
export const componentKinds = [
  "frontend",
  "backend",
  "database",
  "cloud",
  "security",
  "messagebus",
  "external",
];
export function freshId(items, prefix) {
  let n = 1;
  while (items.some((c) => c.id === `${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}
export function createDiagram(type, title) {
  if (type === "architecture") return newDocument(title);
  if (type === "workflow")
    return {
      schema_version: 1,
      diagram_type: type,
      meta: { title, output: "diagram.html" },
      lanes: [{ id: "lane-1", label: "Main" }],
      nodes: [
        {
          id: "node-1",
          type: "backend",
          label: "Start",
          lane: "lane-1",
          col: 0,
        },
      ],
      edges: [],
    };
  if (type === "dataflow")
    return {
      schema_version: 1,
      diagram_type: type,
      meta: { title, output: "diagram.html" },
      stages: [{ label: "Source" }, { label: "Destination" }],
      nodes: [
        { id: "node-1", type: "backend", label: "Source", stage: 0, row: 0 },
        { id: "node-2", type: "database", label: "Store", stage: 1, row: 0 },
      ],
      flows: [],
    };
  if (type === "lifecycle")
    return {
      schema_version: 3,
      diagram_type: type,
      meta: { title, output: "diagram.html" },
      mainPath: ["node-1", "node-2"],
      states: [
        { id: "node-1", type: "start", label: "Start" },
        { id: "node-2", type: "active", label: "Active" },
      ],
      transitions: [{ id: "edge-1", from: "node-1", to: "node-2" }],
    };
  if (type === "sequence")
    return {
      schema_version: 1,
      diagram_type: type,
      meta: { title, output: "diagram.html" },
      participants: [
        { id: "node-1", type: "frontend", label: "Client" },
        { id: "node-2", type: "backend", label: "Service" },
      ],
      messages: [
        {
          id: "message-1",
          from: "node-1",
          to: "node-2",
          y: 200,
          label: "Request",
        },
      ],
    };
  throw new Error("Unsupported diagram creation.");
}
export function addNode(document, fields) {
  const next = clone(document),
    nodes = sourceNodes(next);
  if (!fields.label.trim()) throw new Error("A label is required.");
  const node = {
    id: freshId(nodes, "node"),
    label: fields.label,
    type: fields.type || (document.diagram_type === "lifecycle" ? "active" : "backend"),
  };
  if (document.diagram_type === "workflow")
    Object.assign(node, { lane: fields.lane, col: Number(fields.col) });
  else if (document.diagram_type === "dataflow")
    Object.assign(node, {
      stage: Number(fields.stage),
      row: Number(fields.row),
    });
  else if (["sequence", "lifecycle"].includes(document.diagram_type)) {
  } // Participants have no free position fields.
  else throw new Error("Unsupported node creation.");
  nodes.push(node);
  return next;
}
export function saveEdge(document, index, fields) {
  const next = clone(document),
    edges = connections(next);
  if (
    !sourceNodes(next).some((c) => c.id === fields.from) ||
    !sourceNodes(next).some((c) => c.id === fields.to)
  )
    throw new Error("Choose existing endpoints.");
  const edge = {
    ...(index === null ? { id: freshId(edges, "edge") } : edges[index]),
    ...fields,
  };
  if (document.diagram_type === "dataflow" && !edge.label?.trim())
    throw new Error("A flow label is required.");
  if (index === null) edges.push(edge);
  else edges[index] = edge;
  if (document.diagram_type === "lifecycle") adapterFor(next).validate(next);
  return next;
}
export function saveMainPath(document, ids) {
  if (document.diagram_type !== "lifecycle") throw new Error("Main-path editing supports lifecycle v3.");
  const next = clone(document);
  next.mainPath = [...ids];
  adapterFor(next).validate(next);
  return next;
}
export function deleteEdge(document, index) {
  const edge = connections(document)[index];
  if (document.diagram_type === "lifecycle" && document.mainPath.some((id, i) => id === edge.from && document.mainPath[i + 1] === edge.to))
    throw new Error("Edit mainPath before deleting a required main-path transition.");
  const next = clone(document);
  connections(next).splice(index, 1);
  return next;
}
function cleanNodeReferences(next, ids) {
  next[edgeKey(next)] = connections(next).filter(
    (e) => !ids.includes(e.from) && !ids.includes(e.to),
  );
  if (next.mainPath) {
    next.mainPath = next.mainPath.filter((id) => !ids.includes(id));
    if (next.mainPath.length < 2) delete next.mainPath;
  }
  if (next.semanticChecks) {
    for (const key of ["allowedRoots", "allowedTerminals"])
      if (next.semanticChecks[key])
        next.semanticChecks[key] = next.semanticChecks[key].filter(
          (id) => !ids.includes(id),
        );
    for (const key of ["requiredEdges", "requiredPaths"])
      if (next.semanticChecks[key])
        next.semanticChecks[key] = next.semanticChecks[key].filter(
          (e) => !ids.includes(e.from) && !ids.includes(e.to),
        );
  }
}
export function deleteNode(document, id) {
  assertCompatibility(document);
  if (document.diagram_type === "lifecycle" && document.mainPath.includes(id))
    throw new Error("Edit mainPath before deleting a main-path state.");
  const next = clone(document),
    minimum = ["dataflow", "lifecycle", "sequence"].includes(
      document.diagram_type,
    )
      ? 2
      : 1;
  if (sourceNodes(next).length <= minimum)
    throw new Error(`Keep at least ${minimum} nodes.`);
  next[nodeKey(next)] = sourceNodes(next).filter((c) => c.id !== id);
  cleanNodeReferences(next, [id]);
  if (next.diagram_type === "sequence") {
    if (!next.messages.length)
      throw new Error(
        "Keep at least one message; reassign its endpoints first.",
      );
    if (next.activations)
      next.activations = next.activations.filter((a) => a.participant !== id);
  }
  return next;
}
export function saveLane(document, index, fields) {
  if (document.diagram_type === "lifecycle") throw new Error("Lifecycle v3 does not support lanes.");
  const next = clone(document);
  if (!fields.label.trim()) throw new Error("A lane label is required.");
  if (
    document.diagram_type === "lifecycle" &&
    index === null &&
    next.lanes.length >= 4
  )
    throw new Error("Lifecycle supports up to four lanes.");
  const item = {
    ...(index === null
      ? { id: fields.id || freshId(next.lanes, "lane") }
      : next.lanes[index]),
    ...fields,
  };
  if (index === null && next.lanes.some((l) => l.id === item.id))
    throw new Error("That lane already exists.");
  if (index === null) next.lanes.push(item);
  else next.lanes[index] = item;
  return next;
}
export function deleteLane(document, index, reassign) {
  if (document.diagram_type === "lifecycle") throw new Error("Lifecycle v3 does not support lanes.");
  const next = clone(document),
    lane = next.lanes[index];
  if (document.diagram_type === "lifecycle" && lane.id === "main")
    throw new Error("The lifecycle main lane is required.");
  if (next.lanes.length <= 1) throw new Error("Keep at least one lane.");
  if (!next.lanes.some((l) => l.id === reassign && l.id !== lane.id))
    throw new Error("Choose another lane for affected nodes and groups.");
  for (const node of sourceNodes(next))
    if (node.lane === lane.id) node.lane = reassign;
  for (const group of next.groups || [])
    if (group.lane === lane.id) group.lane = reassign;
  next.lanes.splice(index, 1);
  return next;
}
export function saveStage(document, index, label) {
  if (!label.trim()) throw new Error("A stage label is required.");
  const next = clone(document);
  if (index === null) {
    if (next.stages.length >= 5)
      throw new Error("Dataflow supports up to five stages.");
    next.stages.push({ label });
  } else next.stages[index] = { ...next.stages[index], label };
  return next;
}
export function deleteStage(document, index, reassign) {
  const next = clone(document);
  if (next.stages.length <= 2) throw new Error("Keep at least two stages.");
  if (
    !Number.isInteger(reassign) ||
    reassign === index ||
    !next.stages[reassign]
  )
    throw new Error("Choose another stage for affected nodes.");
  for (const node of next.nodes) {
    const target = node.stage === index ? reassign : node.stage;
    node.stage = target > index ? target - 1 : target;
  }
  next.stages.splice(index, 1);
  return next;
}
