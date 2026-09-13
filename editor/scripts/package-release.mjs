import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const editor = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(editor, "..");
const sourcePackage = JSON.parse(await fs.readFile(path.join(editor, "package.json")));
const version = sourcePackage.version;
const release = path.join(repo, "release");
const stage = path.join(editor, ".tmp", `package-${version}`);
await fs.rm(stage, { recursive: true, force: true });
await fs.mkdir(stage, { recursive: true });
const copy = async (from, to = from) => {
  const source = path.join(repo, from), target = path.join(stage, to);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true });
};
for (const entry of ["editor/dist", "editor/src", "editor/server.mjs", "editor/workspace.mjs", "archify/assets", "archify/renderers", "archify/schemas", "archify/examples", "LICENSE", "THIRD_PARTY_NOTICES.md"])
  await copy(entry);
const manifest = {
  name: "archify-local-editor",
  version,
  private: true,
  type: "module",
  engines: sourcePackage.engines,
  scripts: { start: "node editor/server.mjs" },
  dependencies: sourcePackage.dependencies,
};
await fs.writeFile(path.join(stage, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
const lock = JSON.parse(await fs.readFile(path.join(editor, "package-lock.json")));
lock.name = manifest.name;
lock.version = manifest.version;
lock.packages[""] = { name: manifest.name, version: manifest.version, dependencies: manifest.dependencies, engines: manifest.engines };
await fs.writeFile(path.join(stage, "npm-shrinkwrap.json"), JSON.stringify(lock, null, 2) + "\n");
await fs.writeFile(path.join(stage, "README.md"), "# Archify Local Editor\n\nRun `npm ci`, then `npm start`. See the repository editor guide for file and workspace options.\n");
await fs.mkdir(release, { recursive: true });
const packed = process.platform === "win32"
  ? spawnSync(process.env.ComSpec, ["/d", "/s", "/c", `npm pack --pack-destination ${path.relative(stage, release)}`], { cwd: stage, stdio: "inherit" })
  : spawnSync("npm", ["pack", "--pack-destination", release], { cwd: stage, stdio: "inherit" });
if (packed.error) throw packed.error;
if (packed.status !== 0) process.exit(packed.status || 1);
