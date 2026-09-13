import { spawnSync } from "node:child_process";
const browser = process.argv.includes("--browser");
const commands = [
  ["npm", ["run", "inventory"]],
  ["npm", ["test"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "bench"]],
  ...(browser ? [["npm", ["run", "test:browser"]]] : []),
];
for (const [command, args] of commands) {
  const result = process.platform === "win32"
    ? spawnSync(process.env.ComSpec, ["/d", "/s", "/c", [command, ...args].join(" ")], { cwd: new URL("..", import.meta.url), stdio: "inherit" })
    : spawnSync(command, args, { cwd: new URL("..", import.meta.url), stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
