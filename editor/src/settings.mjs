import architecture from "../../archify/schemas/architecture.schema.json" with { type: "json" };
import workflow from "../../archify/schemas/workflow.schema.json" with { type: "json" };
import dataflow from "../../archify/schemas/dataflow.schema.json" with { type: "json" };
import lifecycle from "../../archify/schemas/lifecycle.schema.json" with { type: "json" };
import sequence from "../../archify/schemas/sequence.schema.json" with { type: "json" };
import common from "../../archify/schemas/common.schema.json" with { type: "json" };
import { clone } from "./document.mjs";
const schemas = { architecture, workflow, dataflow, lifecycle, sequence };
export function schemaFor(type) {
  return schemas[type];
}
export function resolveSchema(spec, root) {
  if (!spec?.$ref) return spec || {};
  const [file, pointer] = spec.$ref.split("#");
  const base = file === "common.schema.json" ? common : root;
  return (
    pointer
      ?.split("/")
      .slice(1)
      .reduce(
        (node, key) => node?.[key.replace(/~1/g, "/").replace(/~0/g, "~")],
        base,
      ) || {}
  );
}
export function settingFields(type) {
  const properties = schemas[type].properties.meta.properties;
  return [
    "title",
    "subtitle",
    "locale",
    "animation",
    "visual_preset",
    "quality_profile",
    "column_fit",
  ]
    .filter((k) => properties[k])
    .map((key) => {
      const property = properties[key];
      return {
        key,
        ...(property.$ref
          ? common.$defs[property.$ref.split("/").at(-1)]
          : property),
      };
    });
}
export function minimumCanvas(type) {
  return schemas[type].properties.meta.properties.viewBox.prefixItems.map(
    (p) => p.minimum,
  );
}
export function patchSettings(document, fields) {
  const next = clone(document);
  for (const spec of settingFields(document.diagram_type)) {
    if (!(spec.key in fields)) continue;
    const value = fields[spec.key];
    if (spec.key === "title" && !value.trim())
      throw new Error("A title is required.");
    if (value === "") {
      delete next.meta[spec.key];
      continue;
    }
    if (spec.enum && !spec.enum.includes(value))
      throw new Error(`Unsupported ${spec.key}.`);
    next.meta[spec.key] = value;
  }
  if ("canvasWidth" in fields) {
    const values = [fields.canvasWidth, fields.canvasHeight];
    if (values.every((v) => v === "")) delete next.meta.viewBox;
    else {
      const min = minimumCanvas(document.diagram_type),
        size = values.map(Number);
      if (
        values.some((v) => v === "") ||
        size.some((v, i) => !Number.isFinite(v) || v < min[i])
      )
        throw new Error(`Canvas minimum is ${min.join(" × ")}.`);
      next.meta.viewBox = size;
    }
  }
  if (document.diagram_type === "architecture" && "gridEnabled" in fields) {
    if (!fields.gridEnabled) delete next.layout;
    else {
      next.layout = { ...(next.layout || {}), mode: "grid" };
      for (const key of ["cols", "gapX", "gapY", "cellW", "cellH"]) {
        if (fields[key] === "") delete next.layout[key];
        else if (fields[key] !== undefined)
          next.layout[key] = Number(fields[key]);
      }
    }
  }
  return next;
}
