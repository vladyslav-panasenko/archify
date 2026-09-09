import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
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
