import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

async function filesBelow(root, folder = root) {
  const files = [];
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(root, target)));
    else if (entry.isFile() && entry.name !== "offline-sw.js" && entry.name !== "index.html")
      files.push("./" + path.relative(root, target).split(path.sep).join("/"));
  }
  return files;
}

export async function writeOfflineServiceWorker(outDir) {
  const root = path.resolve(outDir);
  const files = (await filesBelow(root)).sort();
  if (!files.includes("./offline.html")) throw new Error("Offline build did not emit offline.html.");
  const digest = createHash("sha256").update(files.join("\n")).digest("hex").slice(0, 12);
  const source = `const CACHE = "archify-editor-offline-${digest}";
const PRECACHE = ${JSON.stringify(files)};
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("archify-editor-offline-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => { if (event.request.method !== "GET") return; event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });
`;
  await fs.writeFile(path.join(root, "offline-sw.js"), source);
  return { cache: `archify-editor-offline-${digest}`, files };
}

export function offlineServiceWorkerPlugin(outDir) {
  return { name: "archify-offline-service-worker", closeBundle: () => writeOfflineServiceWorker(outDir) };
}
