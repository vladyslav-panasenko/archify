import {
  newDocument,
  components,
  layoutProblems,
  moveComponents,
} from "../src/document.mjs";
import { automaticLabelPoint } from "../src/label-placement.mjs";
import { performance } from "node:perf_hooks";
export function largeDiagram(count) {
  const cols = Math.ceil(Math.sqrt(count));
  return {
    ...newDocument("Large service map"),
    meta: {
      ...newDocument().meta,
      title: "Large service map",
      viewBox: [cols * 220 + 100, Math.ceil(count / cols) * 140 + 100],
    },
    components: Array.from({ length: count }, (_, i) => ({
      id: `service-${i}`,
      type: "backend",
      label: `Service ${i}`,
      pos: [40 + (i % cols) * 220, 80 + Math.floor(i / cols) * 140],
      size: [120, 60],
    })),
    connections: Array.from({ length: count - 1 }, (_, i) => ({
      from: `service-${i}`,
      to: `service-${i + 1}`,
      label: "HTTP",
    })),
  };
}
function measure(fn) {
  const times = [];
  for (let i = 0; i < 7; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return Number(times.sort((a, b) => a - b)[3].toFixed(3));
}
if (process.argv[1]?.endsWith("large-diagram.mjs")) {
  console.log(
    JSON.stringify(
      [100, 500, 1000].map((count) => {
        const doc = largeDiagram(count),
          boxes = components(doc);
        return {
          nodes: count,
          projectionMs: measure(() => components(structuredClone(doc))),
          diagnosticsMs: measure(() => layoutProblems(doc)),
          moveMs: measure(() =>
            moveComponents(doc, new Map([["service-0", [80, 80]]])),
          ),
          labels20Ms: measure(() => {
            for (let i = 0; i < 20; i++)
              automaticLabelPoint(
                [boxes[i].pos[0] + 60, boxes[i].pos[1] + 30],
                "HTTP",
                boxes,
              );
          }),
        };
      }),
      null,
      2,
    ),
  );
}
