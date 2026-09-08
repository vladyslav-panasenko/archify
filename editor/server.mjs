import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { validateSchema } from "../archify/renderers/shared/validator.mjs";
import { assertDocument, serialize } from "./src/document.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const execute = promisify(execFile);
const hash = (text) => createHash("sha256").update(text).digest("hex");
const MAX_BYTES = 5 * 1024 * 1024;
export function validate(document) {
  validateSchema("architecture", document);
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

export async function render(document) {
  validate(document);
  if (
    document.components.some(
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
            "../archify/renderers/architecture/render-architecture.mjs",
          ),
          input,
          output,
        ],
        {
          cwd: directory,
          timeout: 30000,
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
      try { report = JSON.parse(stderr); } catch { /* non-renderer process failure */ }
      if (report?.diagnostics) throw Object.assign(new Error(report.error), { archifyDiagnostics: report.diagnostics });
      // Present compiler diagnostics without Node stack frames or local source paths.
      const message =
        stderr.match(/Error: ([\s\S]*?)(?:\n\s+at |\nNode\.js|$)/)?.[1] ||
        stderr;
      throw new Error(message.trim());
    }
    return await fs.readFile(output, "utf8");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

export async function createEditorServer({ file, dev = false } = {}) {
  const token = randomBytes(32).toString("hex");
  // Resolve once: clients cannot choose a write path or replace it with a symlink.
  const filePath = file ? await fs.realpath(path.resolve(file)) : null;
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
        if (req.method === "GET" && url.pathname === "/api/document") {
          const text = await fs.readFile(
            filePath ||
              path.join(root, "../archify/examples/web-app.architecture.json"),
            "utf8",
          );
          const document = validate(JSON.parse(text));
          return send(200, {
            document,
            token,
            revision: hash(text),
            writable: Boolean(filePath),
            name: path.basename(filePath || "web-app.architecture.json"),
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
        validate(body.document);
        if (req.method === "POST" && url.pathname === "/api/validate")
          return send(200, { valid: true });
        if (req.method === "PUT" && url.pathname === "/api/document") {
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
            await fs.rename(temporary, filePath);
            return send(200, { revision: hash(text) });
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
          try {
            return send(
              200,
              await render(body.document),
              "text/html; charset=utf-8",
            );
          } finally {
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
      send(error.status || 400, { error: error.message, diagnostics: error.archifyDiagnostics || [] });
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
