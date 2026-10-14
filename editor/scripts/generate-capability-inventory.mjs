import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const types = ["architecture", "workflow", "dataflow", "lifecycle", "sequence"];
const common = JSON.parse(await fs.readFile(path.join(repo, "archify/schemas/common.schema.json")));
const deref = (spec, root) => {
  if (!spec?.$ref) return spec || {};
  const [file, pointer] = spec.$ref.split("#");
  return pointer.split("/").slice(1).reduce((node, key) => node?.[key.replace(/~1/g, "/").replace(/~0/g, "~")], file === "common.schema.json" ? common : root) || {};
};
const visual = [
  /^\/meta\/(title|output|subtitle|locale|animation|visual_preset|quality_profile|column_fit|viewBox)/,
  /^\/(components|nodes|states|participants)\/\*\/(id|label|sublabel|tag|step|type|pos|size|width|height|lane|col|stage|row|yOffset|brand)$/,
  /^\/(connections|edges|flows|transitions|messages)\/\*\/(id|from|to|label|via|labelAt|route|fromSide|toSide|y|kind|style)$/,
  /^\/(lanes|stages)\/\*\/(id|label)$/,
  /^\/(boundaries|groups)\/\*\/(kind|label|wraps|lane|pad)$/,
  /^\/(activations|segments)\/\*\/(participant|label|from|to)$/,
];
function fields(spec, root, at = "", seen = new Set()) {
  const resolved = deref(spec, root);
  if (seen.has(resolved)) return [];
  const nextSeen = new Set(seen).add(resolved), result = [];
  for (const [key, child] of Object.entries(resolved.properties || {})) {
    const field = `${at}/${key}`;
    result.push(field);
    result.push(...fields(child, root, field, nextSeen));
  }
  const items = resolved.items || (resolved.prefixItems?.length === 1 ? resolved.prefixItems[0] : null);
  if (items) result.push(...fields(items, root, `${at}/*`, nextSeen));
  return result;
}
let output = `# Editor schema capability inventory\n\nGenerated from the five schemas by \`editor/scripts/generate-capability-inventory.mjs\`. Regenerate with \`npm run inventory\`. “Visual” means the editor exposes a form, canvas gesture, or structure control. “JSON” means the field is preserved and editable in the validated JSON panel, with compiler output as the authority.\n\n`;
for (const type of types) {
  const schema = JSON.parse(await fs.readFile(path.join(repo, `archify/schemas/${type}.schema.json`)));
  const paths = [...new Set(fields(schema, schema))].sort();
  output += `## ${type}\n\n| Schema field | Editing mode |\n| --- | --- |\n`;
  for (const field of paths) output += `| \`${field}\` | ${field === "/meta/views" || field.startsWith("/meta/views/") ? "Unsupported by Archify 3.1.0; read-only source" : (type === "lifecycle" && field === "/mainPath") || visual.some((rule) => rule.test(field)) ? "Visual + JSON" : "JSON"} |\n`;
  output += "\n";
}
output += `## Operations and explicit limits\n\n| Operation | Support |\n| --- | --- |\n| Open, validate, edit, undo/redo, recovery, canonical JSON export, compiler check/render | All five current types; lifecycle requires v3 |\n| Free positioning, resizing, route waypoints and endpoint sides | Architecture where represented by its schema; lifecycle geometry is automatic |\n| Lane/stage/state/participant/message/range structure | Visual controls use each constrained type's native fields; lifecycle uses states/transitions/mainPath |\n| Fields without a visual control | Validated JSON editing; preserved by visual edits |\n| Guided views/story, legacy lifecycle, unknown diagram type, schema version, field, or invalid construct | Read-only original-source view with download; visual editing, migration, direct save and render are blocked |\n| Required meta.output | New documents use diagram.html; existing documents are not defaulted or migrated on open/save |\n| Schema migration | Explicit preview/apply only; ordinary open/save never upgrades a document |\n| Persisted ports | Architecture v2 supports component ports and connection port references |\n| Inferred runtime topology | Unsupported; topology remains authored |\n| Editor preferences, recovery, tabs, locks, filters and viewport | Local session/project state; excluded from exported diagram JSON |\n`;
await fs.writeFile(path.join(repo, "docs/editor-schema-capabilities.md"), output);
