import { defineConfig } from "vite";
import path from "node:path";
import { offlineServiceWorkerPlugin } from "./scripts/offline-service-worker.mjs";

export default defineConfig({
  plugins: [offlineServiceWorkerPlugin("dist")],
  build: {
    rollupOptions: {
      input: { editor: path.resolve("index.html"), offline: path.resolve("offline.html") },
      output: {
        // Keep the stable canvas runtime separate from editor features and
        // the on-demand JSON validator module.
        manualChunks(id) {
          if (id.includes("node_modules")) return "canvas-runtime";
        },
      },
    },
  },
});
