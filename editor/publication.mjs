import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { publicationNodes } from "./src/publication-authoring.mjs";
import { validateSchema } from "../archify/renderers/shared/validator.mjs";
import { pathsAlias } from "../archify/renderers/shared/output-path.mjs";

const hash = (text) => createHash("sha256").update(text).digest("hex");
const conflict = (message) => Object.assign(new Error(message), { status: 409 });
const compiler = () => import("../archify/publication/publication.mjs");

export function createPublicationService(workspace) {
  async function read(file) {
    if ((await fs.stat(file)).size > 5 * 1024 * 1024)
      throw new Error("JSON exceeds the 5 MB limit.");
    return fs.readFile(file, "utf8");
  }
  async function references(manifest, manifestName) {
    const { validatePublication } = await compiler();
    validatePublication(manifest);
    await workspace.refresh();
    const files = workspace.list().files;
    const diagrams = [];
    const paths = [];
    for (const entry of manifest.diagrams) {
      const name = path.posix.join(path.posix.dirname(manifestName), entry.source);
      const source = files.find((item) => item.name === name);
      if (!source) throw new Error(`Referenced diagram is not a regular workspace JSON file: ${entry.source}`);
      const sourcePath = await workspace.resolve(source.id);
      if (paths.some((previous) => pathsAlias(previous, sourcePath)))
        throw new Error("Two publication diagrams reference the same source file.");
      paths.push(sourcePath);
      const text = await read(sourcePath);
      const document = JSON.parse(text);
      validateSchema(document?.diagram_type, document);
      const ids = publicationNodes(document).map((node) => node.id);
      if (new Set(ids).size !== ids.length)
        throw new Error(`Duplicate source component IDs in ${entry.id}.`);
      diagrams.push({ ...entry, document, workspaceId: source.id, revision: hash(text) });
    }
    for (const link of manifest.links) {
      const diagram = diagrams.find((entry) => entry.id === link.from.diagram);
      if (!publicationNodes(diagram.document).some((node) => node.id === link.from.component))
        throw new Error(`Unknown source component ${link.from.component} in ${link.from.diagram}.`);
    }
    return diagrams;
  }
  async function open(id) {
    await workspace.refresh();
    const name = workspace.list().files.find((entry) => entry.id === id)?.name;
    const text = await read(await workspace.resolve(id));
    const manifest = JSON.parse(text);
    const diagrams = await references(manifest, name);
    const { loadPublication } = await compiler();
    await loadPublication(await workspace.resolve(id));
    return { id, name, manifest, revision: hash(text), diagrams };
  }
  async function save({ name, manifest, revision }) {
    const target = await workspace.publicationTarget(name);
    await references(manifest, target.name);
    const { validatePublication } = await compiler();
    const result = await workspace.saveAs(target.name, manifest, revision, validatePublication);
    return open(result.id);
  }
  async function checkSnapshot(snapshot, revision, sourceRevisions) {
    if (snapshot.revision !== revision)
      throw conflict("The publication changed on disk. Reopen it before rendering.");
    if (!sourceRevisions || snapshot.diagrams.some((entry) => sourceRevisions[entry.id] !== entry.revision))
      throw conflict("A referenced diagram changed on disk. Reopen the publication before rendering.");
  }
  async function render({ id, revision, sourceRevisions }) {
    const snapshot = await open(id);
    await checkSnapshot(snapshot, revision, sourceRevisions);
    if (snapshot.diagrams.some((entry) => publicationNodes(entry.document).some((node) => node.brand && (typeof node.brand === "object" || /^https?:/i.test(node.brand)))))
      throw new Error("Local publication rendering does not fetch remote brand images. Use a built-in brand or the Archify CLI.");
    const name = path.posix.join(path.posix.dirname(snapshot.name), snapshot.manifest.output);
    const target = await workspace.outputTarget(name);
    const temporary = path.join(path.dirname(target.file), `.publication-${randomBytes(8).toString("hex")}.html`);
    try {
      const { compilePublication } = await compiler();
      const receipt = await compilePublication(await workspace.resolve(id), temporary);
      if ((await fs.stat(temporary)).size > 100 * 1024 * 1024)
        throw new Error("Rendered publication exceeds the 100 MB limit.");
      const latest = await open(id);
      await checkSnapshot(latest, revision, sourceRevisions);
      await workspace.outputTarget(name);
      const html = await fs.readFile(temporary, "utf8");
      await fs.rename(temporary, target.file);
      return { ...receipt, output: name, html };
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
  return { open, save, render };
}
