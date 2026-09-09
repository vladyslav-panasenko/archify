import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { serialize } from "./src/document.mjs";
const digest = (text) => createHash("sha256").update(text).digest("hex");

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
  async function target(name) {
    await checkRoot();
    if (
      typeof name !== "string" ||
      name.length > 240 ||
      !name.endsWith(".json")
    )
      throw new Error("Use a relative filename ending in .json.");
    const parts = name.split(/[\\/]/);
    if (
      parts.some(
        (p) =>
          !p ||
          p === "." ||
          p === ".." ||
          /[<>:"|?*\x00-\x1f]/.test(p) ||
          /[. ]$/.test(p) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p) ||
          [".git", "node_modules"].includes(p.toLowerCase()),
      )
    )
      throw new Error("Use a safe filename within the opened workspace.");
    const file = path.join(root, ...parts),
      parent = path.dirname(file);
    if ((await fs.realpath(parent)) !== parent)
      throw new Error(
        "Choose an existing workspace folder without symbolic links.",
      );
    let stat;
    try {
      stat = await fs.lstat(file);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (
      stat &&
      (!stat.isFile() ||
        stat.isSymbolicLink() ||
        (await fs.realpath(file)) !== file)
    )
      throw new Error("The target must be a regular workspace file.");
    return { file, stat, name: parts.join("/") };
  }
  async function saveAs(name, document, revision) {
    validate(document);
    const entry = await target(name),
      { file, stat } = entry;
    if (stat?.size > 5 * 1024 * 1024)
      throw new Error("The existing file exceeds 5 MB. Choose another name.");
    const current = stat ? digest(await fs.readFile(file)) : null;
    if (stat ? revision !== current : revision != null)
      throw Object.assign(
        new Error(
          stat
            ? "This filename already exists or has changed. Review replacement before retrying."
            : "The replacement target was removed. Choose a new filename.",
        ),
        {
          status: 409,
          conflict: { name: entry.name, revision: current, exists: !!stat },
        },
      );
    const temporary = `${file}.${randomBytes(8).toString("hex")}.tmp`,
      text = serialize(document);
    try {
      await fs.writeFile(temporary, text, {
        flag: "wx",
        ...(stat ? { mode: stat.mode } : {}),
      });
      await target(name);
      if (stat) {
        if (digest(await fs.readFile(file)) !== revision)
          throw Object.assign(
            new Error(
              "The target changed during saving. Retry to review the new revision.",
            ),
            { status: 409 },
          );
        await fs.rename(temporary, file);
      } else {
        try {
          await fs.link(temporary, file);
        } catch (e) {
          if (e.code === "EEXIST")
            throw Object.assign(
              new Error(
                "Another file appeared at this name. Retry to review it.",
              ),
              { status: 409 },
            );
          throw e;
        }
      }
    } finally {
      await fs.rm(temporary, { force: true });
    }
    const id = digest(entry.name);
    files.set(id, { id, name: entry.name, type: document.diagram_type, file });
    return { id, name: entry.name, file, revision: digest(text) };
  }
  await refresh();
  return {
    root,
    refresh,
    resolve,
    saveAs,
    list: () => ({
      files: [...files.values()].map(({ file, ...entry }) => entry),
      skipped,
    }),
  };
}
