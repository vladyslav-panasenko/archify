import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { validateSchema } from "../archify/renderers/shared/validator.mjs";
import { validateGuidedViews } from "../archify/renderers/shared/cli.mjs";
import { assertDocument, serialize } from "./src/document.mjs";
import { supportedTypes, sourceNodes } from "./src/adapters/index.mjs";
import { createWorkspace } from "./workspace.mjs";
import { assertResourceLimits } from "./src/resource-limits.mjs";
import { migrateWorkflowToV2 } from "../archify/renderers/workflow/workflow-compiler.mjs";
import { createServerHistory } from "./src/server-history.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const execute = promisify(execFile);
const hash = (text) => createHash("sha256").update(text).digest("hex");
const MAX_BYTES = 5 * 1024 * 1024;
export function validate(document) {
  assertResourceLimits(document);
  if (!supportedTypes.includes(document?.diagram_type))
    throw new Error("Unsupported diagram type.");
  validateSchema(document.diagram_type, document);
  validateGuidedViews(document.diagram_type, document);
  return assertDocument(document);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES)
      throw Object.assign(new Error("JSON exceeds the 5 MB limit."), {
        status: 413,
      });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function render(document, { signal } = {}) {
  validate(document);
  if (
    sourceNodes(document).some(
      (c) =>
        c.brand && (typeof c.brand === "object" || /^https?:/i.test(c.brand)),
    )
  ) {
    throw new Error(
      "Local rendering does not fetch remote brand images. Use a built-in brand, or render this JSON with the Archify CLI.",
    );
  }
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "archify-editor-"));
  try {
    const input = path.join(directory, "input.json"),
      output = path.join(directory, "diagram.html");
    await fs.writeFile(input, serialize(document));
    try {
      await execute(
        process.execPath,
        [
          path.join(
            root,
            `../archify/renderers/${document.diagram_type}/render-${document.diagram_type}.mjs`,
          ),
          input,
          output,
        ],
        {
          cwd: directory,
          timeout: 30000,
          signal,
          maxBuffer: 2 * MAX_BYTES,
          env: {
            ...process.env,
            ARCHIFY_UPDATE_CHECK_DISABLED: "1",
            ARCHIFY_REPO_ROOT: "",
            ARCHIFY_DIAGNOSTIC_FORMAT: "json",
          },
          windowsHide: true,
        },
      );
    } catch (error) {
      const stderr = error.stderr?.trim() || error.message;
      let report;
      try {
        report = JSON.parse(stderr);
      } catch {
        /* non-renderer process failure */
      }
      if (report?.diagnostics)
        throw Object.assign(new Error(report.error), {
          archifyDiagnostics: report.diagnostics,
        });
      // Present compiler diagnostics without Node stack frames or local source paths.
      const message =
        stderr.match(/Error: ([\s\S]*?)(?:\n\s+at |\nNode\.js|$)/)?.[1] ||
        stderr;
      throw new Error(message.trim());
    }
    if ((await fs.stat(output)).size > 20 * MAX_BYTES)
      throw new Error("Rendered HTML exceeds the 100 MB limit. Split this diagram before rendering.");
    return await fs.readFile(output, "utf8");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

export async function createEditorServer({
  file,
  directory,
  dev = false,
} = {}) {
  if (file && directory)
    throw new Error("Choose either --file or --directory.");
  const workspace = directory
    ? await createWorkspace(directory, validate)
    : null;
  const versionHistory = workspace ? await createServerHistory(workspace.root, validate) : null;
  const token = randomBytes(32).toString("hex");
  // Resolve once: clients cannot choose a write path or replace it with a symlink.
  const startupFilePath = file ? await fs.realpath(path.resolve(file)) : null;
  let saving = false,
    rendering = false;
  const vite = dev
    ? await (
        await import("vite")
      ).createServer({ root, server: { middlewareMode: true }, appType: "spa" })
    : null;
  const server = http.createServer(async (req, res) => {
    const send = (status, data, type = "application/json") => {
      res.writeHead(status, {
        "Content-Type": type,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(type === "application/json" ? JSON.stringify(data) : data);
    };
    try {
      const port = server.address().port;
      const origins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
      if (
        !origins.includes(`http://${req.headers.host}`) ||
        (req.headers.origin && !origins.includes(req.headers.origin))
      )
        return send(403, {
          error: "Only same-origin local requests are allowed.",
        });
      const url = new URL(req.url, origins[0]);
      if (url.pathname.startsWith("/api/")) {
        if (req.method === "GET" && url.pathname === "/api/workspace") {
          if (!workspace) return send(200, { files: [], enabled: false });
          await workspace.refresh();
          return send(200, { ...workspace.list(), enabled: true });
        }
        if (req.method === "GET" && url.pathname === "/api/workspace/search") {
          if (!workspace) return send(200, { results: [], enabled: false });
          return send(200, { results: await workspace.search(url.searchParams.get("q") || ""), enabled: true });
        }
        if (req.method === "GET" && url.pathname === "/api/project-preferences") {
          if (!workspace) return send(200, { preferences: null, revision: null, enabled: false });
          return send(200, { ...(await workspace.readPreferences()), enabled: true });
        }
        if (req.method === "GET" && url.pathname === "/api/history") {
          if (req.headers["x-editor-token"] !== token) return send(403, { error: "Editor session expired. Reload before reading saved versions." });
          if (!workspace) return send(200, { entries: [], enabled: false });
          return send(200, { entries: await versionHistory.list(url.searchParams.get("id")), enabled: true });
        }
        if (req.method === "GET" && url.pathname === "/api/document") {
          const workspaceId = workspace
            ? url.searchParams.get("id") || workspace.list().files[0]?.id
            : null;
          const readPath = workspaceId
            ? await workspace.resolve(workspaceId)
            : startupFilePath;
          if (readPath && (await fs.realpath(readPath)) !== readPath)
            throw new Error("Document location changed. Restart the editor.");
          if (readPath && (await fs.stat(readPath)).size > MAX_BYTES)
            throw new Error("JSON exceeds the 5 MB limit.");
          const text = await fs.readFile(
            readPath ||
              path.join(root, "../archify/examples/web-app.architecture.json"),
            "utf8",
          );
          const parsed = JSON.parse(text);
          let document, limitation;
          try {
            document = validate(parsed);
          } catch (error) {
            limitation = error.message;
          }
          return send(200, {
            ...(document
              ? { document }
              : { rawOnly: true, sourceText: text, limitation }),
            token,
            revision: hash(text),
            writable: Boolean(readPath),
            recoveryKey: hash(readPath || path.join(root, "sample")),
            name: workspaceId
              ? workspace.list().files.find((f) => f.id === workspaceId).name
              : path.basename(readPath || "web-app.architecture.json"),
            workspace: Boolean(workspace),
            workspaceId,
          });
        }
        if (req.headers["x-editor-token"] !== token)
          return send(403, {
            error: "Editor session expired. Reload the page before saving.",
          });
        if (
          !["POST", "PUT"].includes(req.method) ||
          !req.headers["content-type"]?.startsWith("application/json")
        )
          return send(415, { error: "Send a JSON request." });
        const body = await readBody(req);
        if (body.document !== undefined) validate(body.document);
        if (req.method === "POST" && url.pathname === "/api/workspace/folder") {
          if (!workspace) return send(403, { error: "Start with --directory to manage project folders." });
          return send(200, await workspace.createFolder(body.name));
        }
        if (req.method === "POST" && url.pathname === "/api/workspace/rename") {
          if (!workspace) return send(403, { error: "Start with --directory to move project files." });
          const result = await workspace.rename(body.id, body.name, body.revision);
          return send(200, {
            token,
            revision: result.revision,
            writable: true,
            recoveryKey: hash(result.file),
            name: result.name,
            workspace: true,
            workspaceId: result.id,
          });
        }
        if (req.method === "POST" && url.pathname === "/api/project-preferences") {
          if (!workspace) return send(403, { error: "Start with --directory to save project preferences." });
          return send(200, await workspace.savePreferences(body.preferences, body.revision));
        }
        if (req.method === "POST" && url.pathname === "/api/history/restore") {
          if (!workspace) return send(403, { error: "Start with --directory to restore saved versions." });
          const filePath = await workspace.resolve(body.id), current = await fs.readFile(filePath, "utf8");
          if (hash(current) !== body.revision) return send(409, { error: "The source changed. Reload it before restoring a saved version." });
          const entry = await versionHistory.read(body.id, body.historyId);
          return send(200, { document: entry.document, sourceRevision: body.revision });
        }
        if (req.method === "POST" && url.pathname === "/api/batch") {
          if (!workspace) return send(403, { error: "Start with --directory to process project files." });
          if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 || body.ids.some((id) => typeof id !== "string"))
            throw new Error("Choose between 1 and 100 workspace files.");
          if (!["validate", "export"].includes(body.operation)) throw new Error("Choose validation or HTML export.");
          if (rendering) return send(409, { error: "A render is already running. Try again shortly." });
          const controller = new AbortController(), cancel = () => controller.abort(), results = [];
          res.on("close", cancel); rendering = body.operation === "export";
          try {
            for (const id of body.ids) {
              if (controller.signal.aborted) break;
              const entry = workspace.list().files.find((file) => file.id === id);
              try {
                const text = await fs.readFile(await workspace.resolve(id), "utf8"), document = validate(JSON.parse(text));
                let output;
                if (body.operation === "export") output = await workspace.writeOutput(body.destination || "", entry.name, await render(document, { signal: controller.signal }), body.overwrite === true);
                results.push({ id, name: entry.name, status: "ok", ...(output ? { output } : {}) });
              } catch (error) { results.push({ id, name: entry?.name || id, status: "error", error: error.message }); }
            }
            return send(200, { results, cancelled: controller.signal.aborted });
          } finally { res.off("close", cancel); rendering = false; }
        }
        if (req.method === "POST" && url.pathname === "/api/validate")
          return send(200, { valid: true });
        if (req.method === "POST" && url.pathname === "/api/migrate") {
          const migration = migrateWorkflowToV2(body.document);
          validate(migration.document);
          return send(200, migration);
        }
        if (req.method === "POST" && url.pathname === "/api/save-as") {
          if (!workspace)
            return send(403, {
              error: "Start with --directory to save new project files.",
            });
          if (saving)
            return send(409, { error: "A save is in progress. Try again." });
          saving = true;
          try {
            const result = await workspace.saveAs(
              body.name,
              body.document,
              body.revision,
            );
            let historyWarning;
            try { await versionHistory.record(result.id, result.name, "save-as", body.document, result.revision); } catch (error) { historyWarning = `Saved, but local version history failed: ${error.message}`; }
            return send(200, {
              document: body.document,
              token,
              revision: result.revision,
              writable: true,
              recoveryKey: hash(result.file),
              name: result.name,
              workspace: true,
              workspaceId: result.id,
              ...(historyWarning ? { historyWarning } : {}),
            });
          } finally {
            saving = false;
          }
        }
        if (req.method === "PUT" && url.pathname === "/api/document") {
          const filePath = workspace
            ? await workspace.resolve(url.searchParams.get("id"))
            : startupFilePath;
          if (!filePath)
            return send(403, {
              error:
                "Use Download JSON, or launch with --file to enable direct saving.",
            });
          if (saving)
            return send(409, { error: "A save is in progress. Try again." });
          saving = true;
          const temporary = `${filePath}.${randomBytes(8).toString("hex")}.tmp`;
          try {
            if ((await fs.realpath(filePath)) !== filePath)
              throw new Error("The file location changed. Restart the editor.");
            const original = await fs.readFile(filePath, "utf8");
            if (hash(original) !== body.revision)
              return send(409, {
                error:
                  "The file changed outside this editor. Download your draft, then reopen the file before saving.",
              });
            const text = serialize(body.document);
            await fs.writeFile(temporary, text, {
              flag: "wx",
              mode: (await fs.stat(filePath)).mode,
            });
            if (hash(await fs.readFile(filePath, "utf8")) !== body.revision)
              return send(409, {
                error:
                  "The file changed during saving. Download your draft and reopen the file.",
              });
            if ((await fs.realpath(filePath)) !== filePath)
              throw new Error("Document location changed during saving.");
            await fs.rename(temporary, filePath);
            const revision = hash(text); let historyWarning;
            if (workspace) try { const id = url.searchParams.get("id"), entry = workspace.list().files.find((item) => item.id === id); await versionHistory.record(id, entry?.name || path.basename(filePath), "save", body.document, revision); } catch (error) { historyWarning = `Saved, but local version history failed: ${error.message}`; }
            return send(200, { revision, ...(historyWarning ? { historyWarning } : {}) });
          } finally {
            await fs.rm(temporary, { force: true });
            saving = false;
          }
        }
        if (req.method === "POST" && url.pathname === "/api/render") {
          if (rendering)
            return send(409, {
              error: "A render is already running. Try again shortly.",
            });
          rendering = true;
          const controller = new AbortController();
          const cancel = () => { if (!res.writableEnded) controller.abort(); };
          res.on("close", cancel);
          try {
            return send(
              200,
              await render(body.document, { signal: controller.signal }),
              "text/html; charset=utf-8",
            );
          } finally {
            res.off("close", cancel);
            rendering = false;
          }
        }
        return send(404, { error: "Unknown endpoint." });
      }
      if (vite)
        return vite.middlewares(req, res, () =>
          send(404, "Not found", "text/plain"),
        );
      if (req.method !== "GET")
        return send(405, "Method not allowed", "text/plain");
      const relative =
        url.pathname === "/"
          ? "index.html"
          : decodeURIComponent(url.pathname).slice(1);
      const dist = path.join(root, "dist");
      const target = path.resolve(dist, relative);
      if (!target.startsWith(dist + path.sep))
        return send(403, "Forbidden", "text/plain");
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
      };
      try {
        send(
          200,
          await fs.readFile(target),
          types[path.extname(target)] || "application/octet-stream",
        );
      } catch {
        send(404, "Not found. Run npm run build first.", "text/plain");
      }
    } catch (error) {
      send(error.status || 400, {
        error: error.message,
        diagnostics: error.archifyDiagnostics || [],
        conflict: error.conflict,
      });
    }
  });
  server.on("close", () => {
    void vite?.close();
  });
  return server;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2),
    value = (key) =>
      args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
  const port = Number(value("--port") || 4173);
  const server = await createEditorServer({
    file: value("--file"),
    directory: value("--directory"),
    dev: args.includes("--dev"),
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(`Archify Editor: http://127.0.0.1:${server.address().port}`),
  );
  server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
