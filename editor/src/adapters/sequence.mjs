function dimensions(document) {
  const count = document.participants.length,
    width = document.meta.viewBox?.[0] || 820;
  const spread = document.meta.column_fit === "spread";
  const boxWidth = spread
    ? Math.max(86, Math.min(190, Math.round((width - 124) / count) - 24))
    : 86;
  return {
    boxWidth,
    gap:
      spread && count > 1
        ? Math.max(108, (width - 102 - boxWidth) / (count - 1))
        : 108,
    left: spread ? 62 : 19,
  };
}
export function messageRange(document, index) {
  const original = document.messages[index].y;
  const anchors = [
    ...document.messages.filter((_, i) => i !== index).map((m) => m.y),
    ...(document.segments || []).flatMap((s) => [s.from, s.to]),
    ...(document.activations || []).flatMap((a) => [a.from, a.to]),
  ];
  let min = 160,
    max = (document.meta.viewBox?.[1] || 760) - 65;
  for (const y of anchors) {
    if (y === original) return [original, original];
    if (y < original) min = Math.max(min, y + 1);
    if (y > original) max = Math.min(max, y - 1);
  }
  return [min, max];
}
export const sequence = {
  nodesKey: "participants",
  edgesKey: "messages",
  minSize: [86, 54],
  resizable: false,
  fields: ["order"],
  routes: [],
  hint: "Drag horizontally to reorder participants. Message endpoints and ordering remain unchanged. Participant sizes are defined by Archify.",
  project(document, node) {
    const d = dimensions(document),
      order = document.participants.findIndex((p) => p.id === node.id);
    return {
      ...node,
      order,
      pos: [d.left + order * d.gap, 72],
      size: [d.boxWidth, 54],
    };
  },
  move(document, node, [x]) {
    const d = dimensions(document),
      index = document.participants.findIndex((p) => p.id === node.id),
      target = Math.max(
        0,
        Math.min(
          document.participants.length - 1,
          Math.round((x - d.left) / d.gap),
        ),
      );
    document.participants.splice(index, 1);
    document.participants.splice(target, 0, node);
  },
  patchNode(document, node, key, value) {
    if (key !== "order") return false;
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value >= document.participants.length
    )
      throw new Error("Participant order is outside the document.");
    const d = dimensions(document);
    this.move(document, node, [d.left + value * d.gap]);
    return true;
  },
  edgeData(document, message) {
    const from = this.project(
        document,
        document.participants.find((p) => p.id === message.from),
      ),
      to = this.project(
        document,
        document.participants.find((p) => p.id === message.to),
      );
    const x1 = from.pos[0] + from.size[0] / 2,
      x2 = to.pos[0] + to.size[0] / 2;
    return {
      ...message,
      sequenceLine: [
        [x1, message.y],
        [x2, message.y],
      ],
      labelAt: [(x1 + x2) / 2, message.y - 12],
    };
  },
  regions(document) {
    return document.participants.map((p) => {
      const node = this.project(document, p);
      return {
        id: `lifeline:${p.id}`,
        type: "lifeline",
        label: "",
        pos: [node.pos[0] + node.size[0] / 2, 126],
        size: [1, Math.max(100, (document.meta.viewBox?.[1] || 760) - 191)],
      };
    });
  },
  patchConnection(document, index, patch) {
    const message = document.messages[index],
      [min, max] = messageRange(document, index);
    for (const [key, value] of Object.entries(patch)) {
      if (key === "labelAt") {
        if (!value?.every(Number.isFinite))
          throw new Error("Use numeric message coordinates.");
        message.y = Math.max(
          min,
          Math.min(max, Math.round((value[1] + 12) * 100) / 100),
        );
      } else if (key === "y") {
        if (!Number.isFinite(value) || value < min || value > max)
          throw new Error(
            `Message Y must stay between ${min} and ${max} to preserve ordering and activation/segment boundaries.`,
          );
        message.y = value;
      } else if (["label", "note"].includes(key)) {
        if (key === "label" && !value.trim())
          throw new Error("A message label is required.");
        message[key] = value;
      } else throw new Error(`Sequence messages do not support ${key}.`);
    }
  },
  validate(document) {
    if (document.participants.length < 2)
      throw new Error("Sequence needs at least two participants.");
    if (!Array.isArray(document.messages))
      throw new Error("Sequence needs messages.");
    for (const activation of document.activations || [])
      if (!document.participants.some((p) => p.id === activation.participant))
        throw new Error("Unknown activation participant.");
  },
};
