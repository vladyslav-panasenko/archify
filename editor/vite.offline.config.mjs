import { defineConfig } from "vite";
import path from "node:path";
import { offlineServiceWorkerPlugin } from "./scripts/offline-service-worker.mjs";
export default defineConfig({ plugins: [offlineServiceWorkerPlugin("offline-dist")], base: "./", build: { outDir: "offline-dist", emptyOutDir: true, rollupOptions: { input: path.resolve("offline.html"), output: { manualChunks(id) { if (id.includes("node_modules")) return "canvas-runtime"; } } } } });
