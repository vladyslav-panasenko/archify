import * as validators from "../../archify/renderers/shared/generated-validators.mjs";
import { assertDocument, newDocument } from "./document.mjs";
import { migrateArchitectureToV2 } from "./architecture-migration.mjs";

const response = (status, value, type = "application/json") => new Response(type === "application/json" ? JSON.stringify(value) : value, { status, headers: { "Content-Type": type } });
const validate = (document) => {
  assertDocument(document); const validator = validators[document.diagram_type];
  if (!validator?.(document)) throw new Error(validator?.errors?.map((entry) => `${entry.instancePath || "/"} ${entry.message}`).join("; ") || "Unsupported diagram type.");
  return document;
};

export function installOfflineRuntime(storage = localStorage) {
  const nativeFetch = window.fetch.bind(window), key = "archify-offline-source:v1";
  window.__ARCHIFY_RUNTIME__ = { mode: "offline", compilerAvailable: false, workspaceAvailable: false };
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    if (!url.pathname.startsWith("/api/")) return nativeFetch(input, init);
    try {
      if (url.pathname === "/api/document" && (!init.method || init.method === "GET")) {
        let document; try { document = validate(JSON.parse(storage.getItem(key))); } catch { document = newDocument("Offline architecture"); }
        return response(200, { document, token: "offline", revision: null, writable: false, recoveryKey: "offline-browser", name: "offline.architecture.json", workspace: false, workspaceId: null, offline: true, compilerAvailable: false });
      }
      if (["/api/workspace", "/api/workspace/search"].includes(url.pathname)) return response(200, { files: [], folders: [], results: [], enabled: false });
      if (url.pathname === "/api/project-preferences") return response(200, { preferences: null, revision: null, enabled: false });
      if (url.pathname === "/api/history") return response(200, { entries: [], enabled: false });
      const body = init.body ? JSON.parse(init.body) : {};
      if (url.pathname === "/api/validate") { validate(body.document); return response(200, { valid: true, offline: true }); }
      if (url.pathname === "/api/migrate") {
        const result = migrateArchitectureToV2(validate(body.document)); return response(200, result);
      }
      if (url.pathname === "/api/render") return response(501, { error: "Compiler HTML rendering is unavailable in the browser-only offline edition. Download JSON and open it in the local or desktop edition to render." });
      return response(403, { error: "This operation requires the local or desktop edition." });
    } catch (error) { return response(400, { error: error.message }); }
  };
  return () => { window.fetch = nativeFetch; };
}
