import { createArchitectureRouter } from "../../archify/renderers/architecture/scene-routing.mjs";
import { labelPoint } from "../../archify/renderers/shared/geometry.mjs";
import { components } from "./document.mjs";

export function architectureRoutes(document) {
  const boxes = new Map(components(document).map((component) => {
    const [x, y] = component.pos, [width, height] = component.size;
    return [component.id, { ...component, x, y, width, height, cx: x + width / 2, cy: y + height / 2 }];
  }));
  const router = createArchitectureRouter(document, boxes);
  return (document.connections || []).map((connection) => ({
    ...router.pathFor(connection),
    ...router.connectionSides(connection),
    labelPoint: labelPoint(connection, router.pathFor(connection).points),
  }));
}
