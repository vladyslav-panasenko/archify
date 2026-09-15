import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createEditorServer } from "../server.mjs";

export function browserCandidates(platform = process.platform, env = process.env) {
  if (platform === "win32") return [env.ARCHIFY_BROWSER, path.join(env.PROGRAMFILES || "C:\\Program Files", "Microsoft/Edge/Application/msedge.exe"), path.join(env.PROGRAMFILES || "C:\\Program Files", "Google/Chrome/Application/chrome.exe"), path.join(env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Microsoft/Edge/Application/msedge.exe"), path.join(env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe")].filter(Boolean);
  if (platform === "darwin") return [env.ARCHIFY_BROWSER, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Chromium.app/Contents/MacOS/Chromium"].filter(Boolean);
  return [env.ARCHIFY_BROWSER, "google-chrome", "microsoft-edge", "chromium", "chromium-browser"].filter(Boolean);
}

export function desktopOptions(args) {
  const value = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const file = value("--file"), directory = value("--directory");
  if (file && directory) throw new Error("Choose either --file or --directory.");
  return { file, directory, browser: value("--browser"), noLaunch: args.includes("--no-launch") };
}

async function exists(command) {
  if (!/[\\/]/.test(command)) return true;
  try { return (await fs.stat(command)).isFile(); } catch { return false; }
}

export async function launchDesktop(args = process.argv.slice(2)) {
  const options = desktopOptions(args), server = await createEditorServer({ file: options.file, directory: options.directory });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const url = `http://127.0.0.1:${server.address().port}`, profile = await fs.mkdtemp(path.join(os.tmpdir(), "archify-desktop-"));
  let child, closing = false;
  const close = async () => { if (closing) return; closing = true; await new Promise((resolve) => server.close(resolve)); await fs.rm(profile, { recursive: true, force: true }); };
  process.once("SIGINT", close); process.once("SIGTERM", close);
  if (options.noLaunch) return { url, close };
  const candidates = options.browser ? [options.browser] : browserCandidates(); let browser;
  for (const candidate of candidates) if (await exists(candidate)) { browser = candidate; break; }
  if (!browser) { await close(); throw new Error("Install Chrome, Edge, or Chromium, or pass --browser <executable>."); }
  child = spawn(browser, [`--app=${url}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-sync"], { stdio: "ignore", windowsHide: false });
  child.once("error", async (error) => { await close(); console.error(`Could not start the desktop window: ${error.message}`); process.exitCode = 1; });
  child.once("exit", close); return { url, browser, close, child };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) launchDesktop().catch((error) => { console.error(error.message); process.exitCode = 1; });
