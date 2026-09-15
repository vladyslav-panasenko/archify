import { spawnSync } from "node:child_process";
const command = process.platform === "win32" ? process.env.ComSpec : "npm";
const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm exec vite -- build --config vite.offline.config.mjs"] : ["exec", "vite", "--", "build", "--config", "vite.offline.config.mjs"];
const result = spawnSync(command, args, { cwd: new URL("..", import.meta.url), stdio: "inherit" });
if (result.error) throw result.error; process.exitCode = result.status || 0;
