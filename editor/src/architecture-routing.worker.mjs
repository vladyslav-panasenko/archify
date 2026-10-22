import { architectureRoutes } from "./architecture-routing.mjs";

self.onmessage = ({ data }) => {
  self.postMessage(architectureRoutes(data));
};
