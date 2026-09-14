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
    folders = [],
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
    const nextFolders = [];
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
          ["node_modules", ".git", ".archify-editor-history"].includes(entry.name)
        )
          continue;
        const file = path.join(folder, entry.name);
        // A replaced parent directory must not redirect enumeration outside root.
        if ((await fs.realpath(file)) !== file) continue;
        if (entry.isDirectory()) {
          nextFolders.push(path.relative(root, file).split(path.sep).join("/"));
          await walk(file);
        }
        else if (entry.isFile() && /\.json$/i.test(entry.name) && entry.name !== ".archify-editor.json") {
          try {
            if ((await fs.stat(file)).size > 5 * 1024 * 1024)
              throw new Error("Too large");
            const document = JSON.parse(await fs.readFile(file, "utf8"));
            let type = "unsupported";
            try {
              validate(document);
              type = document.diagram_type;
            } catch {
              // Keep parseable future/invalid Archify sources discoverable so
              // the editor can open their lossless read-only source view.
              if (typeof document?.diagram_type === "string") type = `${document.diagram_type} (read-only)`;
            }
            const name = path.relative(root, file).split(path.sep).join("/");
            const id = createHash("sha256").update(name).digest("hex");
            next.set(id, { id, name, type, file });
          } catch {
            rejected++;
          }
        }
      }
    }
    await walk(root);
    files = next;
    folders = nextFolders;
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
  function safeParts(name, requireJson = false) {
    if (typeof name !== "string" || name.length > 240)
      throw new Error(requireJson ? "Use a relative filename ending in .json." : "Use a relative workspace path.");
    if (requireJson && !name.endsWith(".json"))
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
      throw new Error("Use a safe path within the opened workspace.");
    return parts;
  }
  async function target(name) {
    await checkRoot();
    const parts = safeParts(name, true);
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
  async function createFolder(name) {
    await checkRoot();
    const parts = safeParts(name);
    let folder = root;
    for (const [index, part] of parts.entries()) {
      folder = path.join(folder, part);
      let stat;
      try { stat = await fs.lstat(folder); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      if (stat) {
        if (!stat.isDirectory() || stat.isSymbolicLink() || (await fs.realpath(folder)) !== folder)
          throw new Error("Workspace folders must be regular directories without symbolic links.");
        if (index === parts.length - 1)
          throw Object.assign(new Error("That workspace folder already exists."), { status: 409 });
      } else {
        await fs.mkdir(folder);
        if ((await fs.realpath(folder)) !== folder)
          throw new Error("The created folder did not remain inside the workspace.");
      }
    }
    await refresh();
    return { name: parts.join("/") };
  }
  async function rename(id, name, revision) {
    const source = files.get(id);
    if (!source) throw Object.assign(new Error("Unknown workspace document. Refresh the file list."), { status: 404 });
    const sourceFile = await resolve(id), sourceText = await fs.readFile(sourceFile, "utf8");
    if (digest(sourceText) !== revision)
      throw Object.assign(new Error("The source changed outside the editor. Reload it before moving."), { status: 409 });
    const destination = await target(name);
    if (destination.stat)
      throw Object.assign(new Error("The destination already exists. Choose another path."), { status: 409, conflict: { name: destination.name, exists: true } });
    await fs.rename(sourceFile, destination.file);
    await refresh();
    const nextId = digest(destination.name);
    return { id: nextId, name: destination.name, file: destination.file, revision: digest(sourceText) };
  }
  async function search(query) {
    if (typeof query !== "string" || !query.trim() || query.length > 120)
      throw new Error("Enter between 1 and 120 characters to search.");
    const needle = query.trim().toLocaleLowerCase();
    const results = [];
    for (const entry of files.values()) {
      if (results.length >= 100) break;
      const text = await fs.readFile(entry.file, "utf8");
      const normalized = text.toLocaleLowerCase();
      const nameMatch = entry.name.toLocaleLowerCase().includes(needle);
      const index = normalized.indexOf(needle);
      if (!nameMatch && index < 0) continue;
      const start = Math.max(0, index - 50), end = Math.min(text.length, index + needle.length + 90);
      results.push({
        id: entry.id,
        name: entry.name,
        type: entry.type,
        match: nameMatch && index < 0 ? "File path" : text.slice(start, end).replace(/\s+/g, " ").trim(),
      });
    }
    return results;
  }
  async function readPreferences() {
    const file = path.join(root, ".archify-editor.json");
    let text;
    try { text = await fs.readFile(file, "utf8"); }
    catch (error) { if (error.code === "ENOENT") return { preferences: null, revision: null }; throw error; }
    if ((await fs.realpath(file)) !== file || (await fs.stat(file)).size > 64 * 1024)
      throw new Error("Project preferences must be a regular file smaller than 64 KB.");
    const value = JSON.parse(text);
    if (value?.version !== 1 || !value.preferences || typeof value.preferences !== "object" || Array.isArray(value.preferences))
      throw new Error("Project preferences use an unsupported format.");
    return { preferences: value.preferences, revision: digest(text) };
  }
  async function savePreferences(preferences, revision) {
    const allowed = new Set(["gridSize", "smartSnap", "minimap", "layout"]);
    const layout = preferences?.layout;
    if (!preferences || typeof preferences !== "object" || Array.isArray(preferences) || Object.keys(preferences).some((key) => !allowed.has(key)) || !Number.isInteger(preferences.gridSize) || preferences.gridSize < 4 || preferences.gridSize > 100 || typeof preferences.smartSnap !== "boolean" || typeof preferences.minimap !== "boolean" || (layout !== undefined && (!layout || typeof layout !== "object" || !["grid", "resolve", "directed", "anchored"].includes(layout.mode) || !["right", "down"].includes(layout.direction) || !Number.isFinite(layout.gap) || layout.gap < 16 || layout.gap > 500)))
      throw new Error("Project preferences contain unsupported defaults.");
    const file = path.join(root, ".archify-editor.json");
    let current = null;
    try { current = await fs.readFile(file, "utf8"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    if ((current ? digest(current) : null) !== (revision ?? null))
      throw Object.assign(new Error("Project preferences changed. Reload them before saving."), { status: 409 });
    const text = JSON.stringify({ version: 1, preferences }, null, 2) + "\n", temporary = `${file}.${randomBytes(8).toString("hex")}.tmp`;
    try {
      await fs.writeFile(temporary, text, { flag: "wx" });
      let latest = null; try { latest = await fs.readFile(file, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
      if ((latest ? digest(latest) : null) !== (revision ?? null)) throw Object.assign(new Error("Project preferences changed during saving. Reload them before retrying."), { status: 409 });
      await fs.rename(temporary, file);
    }
    finally { await fs.rm(temporary, { force: true }); }
    return { preferences, revision: digest(text) };
  }
  async function writeOutput(directoryName, sourceName, text, overwrite = false) {
    await checkRoot();
    const directoryParts = directoryName ? safeParts(directoryName) : [], folder = path.join(root, ...directoryParts);
    if ((await fs.realpath(folder)) !== folder) throw new Error("Export destination must be an existing regular workspace folder.");
    const outputName = path.basename(sourceName).replace(/\.json$/i, ".html"), file = path.join(folder, outputName);
    let stat;
    try { stat = await fs.lstat(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (stat && (!stat.isFile() || stat.isSymbolicLink() || !overwrite))
      throw Object.assign(new Error(stat?.isFile() ? "Export already exists. Enable overwrite to replace it." : "Export target is not a regular file."), { status: 409 });
    const temporary = `${file}.${randomBytes(8).toString("hex")}.tmp`;
    try { await fs.writeFile(temporary, text, { flag: "wx" }); await fs.rename(temporary, file); }
    finally { await fs.rm(temporary, { force: true }); }
    return path.relative(root, file).split(path.sep).join("/");
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
    createFolder,
    rename,
    search,
    readPreferences,
    savePreferences,
    writeOutput,
    list: () => ({
      files: [...files.values()].map(({ file, ...entry }) => entry),
      folders,
      skipped,
    }),
  };
}
