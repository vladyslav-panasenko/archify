import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

const digest = (text) => createHash("sha256").update(text).digest("hex");
const validId = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export async function createServerHistory(root, validate) {
  const directory = path.join(root, ".archify-editor-history");
  const folderFor = (workspaceId) => { if (!validId(workspaceId)) throw new Error("Invalid workspace history identity."); return path.join(directory, workspaceId); };
  async function record(workspaceId, name, operation, document, revision) {
    validate(document); const folder = folderFor(workspaceId); await fs.mkdir(folder, { recursive: true });
    const payload = { format: "archify-server-history", version: 1, id: `${Date.now()}-${randomBytes(5).toString("hex")}`, createdAt: new Date().toISOString(), name, operation, revision, document: structuredClone(document) };
    const text = JSON.stringify(payload, null, 2) + "\n"; if (text.length > 6 * 1024 * 1024) throw new Error("History snapshot exceeds the 6 MB limit.");
    await fs.writeFile(path.join(folder, `${payload.id}.json`), text, { flag: "wx" });
    const names = (await fs.readdir(folder)).filter((entry) => entry.endsWith(".json")).sort().reverse();
    await Promise.all(names.slice(50).map((entry) => fs.rm(path.join(folder, entry), { force: true })));
    return { ...payload, document: undefined };
  }
  async function list(workspaceId) {
    const folder = folderFor(workspaceId); let names;
    try { names = await fs.readdir(folder); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const results = [];
    for (const name of names.filter((entry) => entry.endsWith(".json")).sort().reverse().slice(0, 50)) {
      const payload = JSON.parse(await fs.readFile(path.join(folder, name), "utf8"));
      if (payload?.format === "archify-server-history" && payload.version === 1) results.push({ id: payload.id, createdAt: payload.createdAt, name: payload.name, operation: payload.operation, revision: payload.revision });
    }
    return results;
  }
  async function read(workspaceId, historyId) {
    if (typeof historyId !== "string" || !/^\d{10,}-[a-f0-9]{10}$/.test(historyId)) throw new Error("Invalid history entry.");
    const payload = JSON.parse(await fs.readFile(path.join(folderFor(workspaceId), `${historyId}.json`), "utf8"));
    if (payload?.format !== "archify-server-history" || payload.version !== 1) throw new Error("Unsupported history entry.");
    validate(payload.document); return payload;
  }
  return { record, list, read, digest };
}
