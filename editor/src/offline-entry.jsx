import { installOfflineRuntime } from "./offline-runtime.mjs";

installOfflineRuntime();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./offline-sw.js").catch(() => {});
await import("./main.jsx");
