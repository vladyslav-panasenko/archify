import { components, moveComponents } from "./document.mjs";

function directedLayers(nodes, edges) {
  const ids = nodes.map((n) => n.id),
    adj = new Map(ids.map((id) => [id, []]));
  for (const e of edges)
    if (adj.has(e.from) && adj.has(e.to)) adj.get(e.from).push(e.to);
  // Collapse cycles before ranking so every directed document terminates.
  let counter = 0;
  const index = new Map(),
    low = new Map(),
    stack = [],
    active = new Set(),
    groups = [];
  function visit(id) {
    index.set(id, counter);
    low.set(id, counter++);
    stack.push(id);
    active.add(id);
    for (const to of adj.get(id)) {
      if (!index.has(to)) {
        visit(to);
        low.set(id, Math.min(low.get(id), low.get(to)));
      } else if (active.has(to))
        low.set(id, Math.min(low.get(id), index.get(to)));
    }
    if (low.get(id) === index.get(id)) {
      const group = [];
      let member;
      do {
        member = stack.pop();
        active.delete(member);
        group.push(member);
      } while (member !== id);
      groups.push(group.sort());
    }
  }
  ids.forEach((id) => {
    if (!index.has(id)) visit(id);
  });
  const owner = new Map(groups.flatMap((g, i) => g.map((id) => [id, i]))),
    out = groups.map(() => new Set()),
    degree = groups.map(() => 0),
    rank = groups.map(() => 0);
  for (const [from, tos] of adj)
    for (const to of tos) {
      const a = owner.get(from),
        b = owner.get(to);
      if (a !== b && !out[a].has(b)) {
        out[a].add(b);
        degree[b]++;
      }
    }
  const queue = degree.flatMap((d, i) => (d === 0 ? [i] : []));
  for (let q = 0; q < queue.length; q++) {
    const a = queue[q];
    for (const b of out[a]) {
      rank[b] = Math.max(rank[b], rank[a] + 1);
      if (--degree[b] === 0) queue.push(b);
    }
  }
  const layers = [];
  for (const id of ids) (layers[rank[owner.get(id)]] ||= []).push(id);
  // Barycenter sweeps reduce crossings without changing node identities.
  for (let pass = 0; pass < 4; pass++) {
    const order = pass % 2 ? [...layers.keys()].reverse() : [...layers.keys()];
    for (const level of order) {
      const neighbor = layers[level + (pass % 2 ? 1 : -1)];
      if (!neighbor) continue;
      const positions = new Map(neighbor.map((id, i) => [id, i]));
      const score = (id) => {
        const ns = edges
          .flatMap((e) =>
            pass % 2
              ? e.from === id
                ? [e.to]
                : []
              : e.to === id
                ? [e.from]
                : [],
          )
          .filter((n) => positions.has(n));
        return ns.length
          ? ns.reduce((sum, n) => sum + positions.get(n), 0) / ns.length
          : layers[level].indexOf(id);
      };
      const scores = new Map(layers[level].map((id) => [id, score(id)]));
      layers[level].sort(
        (a, b) => scores.get(a) - scores.get(b) || a.localeCompare(b),
      );
    }
  }
  return layers;
}

export function autoLayout(
  document,
  ids,
  locked = [],
  { mode = "grid", direction = "right", gap = 60 } = {},
) {
  if (
    !["grid", "directed"].includes(mode) ||
    !["right", "down"].includes(direction) ||
    !Number.isFinite(gap) ||
    gap < 16 ||
    gap > 500
  )
    throw new Error("Choose a supported layout and spacing from 16 to 500.");
  if (document.diagram_type !== "architecture")
    throw new Error("Auto-arrange supports architecture diagrams.");
  const selected = new Set(ids.filter((id) => !locked.includes(id)));
  const boxes = components(document),
    moving = boxes
      .filter((c) => selected.has(c.id))
      .sort((a, b) => a.id.localeCompare(b.id));
  if (!moving.length)
    throw new Error("Select at least one unlocked component.");
  if (moving.length > 2000)
    throw new Error("Arrange at most 2,000 components at once.");
  const obstacles = boxes.filter((c) => !selected.has(c.id));
  const width = Math.max(...moving.map((c) => c.size[0])) + gap;
  const height = Math.max(...moving.map((c) => c.size[1])) + gap;
  const columns = Math.ceil(Math.sqrt(moving.length));
  const origin = [
    Math.max(20, Math.min(...moving.map((c) => c.pos[0]))),
    Math.max(60, Math.min(...moving.map((c) => c.pos[1]))),
  ];
  const positions = new Map();
  const layers =
    mode === "directed"
      ? directedLayers(moving, document.connections || [])
      : null;
  const cells = layers
    ? new Map(
        layers.flatMap((layer, x) =>
          layer.map((id, y) => [id, direction === "right" ? [x, y] : [y, x]]),
        ),
      )
    : null;
  let cell = 0;
  for (const item of moving) {
    let pos,
      attempts = 0;
    do {
      if (++attempts > 10000)
        throw new Error(
          "No nearby free placement. Reduce the selection or move blocking components.",
        );
      pos = [
        origin[0] +
          (cells
            ? cells.get(item.id)[0] + (direction === "down" ? attempts - 1 : 0)
            : cell % columns) *
            width,
        origin[1] +
          (cells
            ? cells.get(item.id)[1] + (direction === "right" ? attempts - 1 : 0)
            : Math.floor(cell / columns)) *
            height,
      ];
      cell++;
    } while (
      obstacles.some(
        (c) =>
          pos[0] < c.pos[0] + c.size[0] + 20 &&
          pos[0] + item.size[0] + 20 > c.pos[0] &&
          pos[1] < c.pos[1] + c.size[1] + 20 &&
          pos[1] + item.size[1] + 20 > c.pos[1],
      )
    );
    positions.set(item.id, pos);
    obstacles.push({ ...item, pos });
  }
  return moveComponents(document, positions);
}
