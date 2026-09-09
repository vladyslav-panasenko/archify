import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export async function createWorkspace(directory, validate) {
  const root = await fs.realpath(path.resolve(directory));
  if (!(await fs.stat(root)).isDirectory())
    throw new Error("Workspace must be a directory.");
  let files = new Map(),
    skipped = 0;
  async function checkRoot() {
    if ((await fs.realpath(root)) !== root)
      throw new Error("Workspace location changed. Restart the editor.");
  }
  async function refresh() {
    await checkRoot();
    const next = new Map();
    let visited = 0,
      rejected = 0;
    async function walk(folder) {
      for (const entry of (
        await fs.readdir(folder, { withFileTypes: true })
      ).sort((a, b) => a.name.localeCompare(b.name))) {
        if (++visited > 10000)
          throw new Error(
            "Workspace exceeds 10,000 entries. Choose a smaller diagrams directory.",
          );
        if (
          entry.isSymbolicLink() ||
          ["node_modules", ".git"].includes(entry.name)
        )
          continue;
        const file = path.join(folder, entry.name);
        // A replaced parent directory must not redirect enumeration outside root.
        if ((await fs.realpath(file)) !== file) continue;
        if (entry.isDirectory()) await walk(file);
        else if (entry.isFile() && /\.json$/i.test(entry.name)) {
          try {
            if ((await fs.stat(file)).size > 5 * 1024 * 1024)
              throw new Error("Too large");
            const document = validate(
              JSON.parse(await fs.readFile(file, "utf8")),
            );
            const name = path.relative(root, file).split(path.sep).join("/");
            const id = createHash("sha256").update(name).digest("hex");
            next.set(id, { id, name, type: document.diagram_type, file });
          } catch {
            rejected++;
          }
        }
      }
    }
    await walk(root);
    files = next;
    skipped = rejected;
  }
  async function resolve(id) {
    await checkRoot();
    const entry = files.get(id);
    if (!entry)
      throw Object.assign(
        new Error("Unknown workspace document. Refresh the file list."),
        { status: 404 },
      );
    if ((await fs.realpath(entry.file)) !== entry.file)
      throw new Error("Document location changed. Refresh the workspace.");
    return entry.file;
  }
  await refresh();
  return {
    root,
    refresh,
    resolve,
    list: () => ({
      files: [...files.values()].map(({ file, ...entry }) => entry),
      skipped,
    }),
  };
}
