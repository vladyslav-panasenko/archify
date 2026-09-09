import {
  sourceNodes,
  connections,
  nodeKey,
  edgeKey,
} from "./adapters/index.mjs";
export function compilerProblems(document, diagnostics) {
  return diagnostics.map((issue, i) => {
    const subject = issue.subject || {},
      match = subject.path?.match(/^\/([^/]+)\/(\d+)/),
      collection = subject.collection || match?.[1],
      index = subject.index ?? (match ? Number(match[2]) : null);
    let ids = [],
      edgeIndex = null;
    if (
      collection === nodeKey(document) &&
      Number.isInteger(index) &&
      sourceNodes(document)[index]
    )
      ids = [sourceNodes(document)[index].id];
    else if (
      collection === edgeKey(document) &&
      Number.isInteger(index) &&
      connections(document)[index]
    ) {
      const e = connections(document)[index];
      ids = [e.from, e.to];
      edgeIndex = index;
    } else if (subject.identity) {
      const node = sourceNodes(document).find((n) => n.id === subject.identity);
      if (node) ids = [node.id];
      else {
        const n = connections(document).findIndex(
          (e) => e.id === subject.identity,
        );
        if (n >= 0) {
          edgeIndex = n;
          ids = [connections(document)[n].from, connections(document)[n].to];
        }
      }
    }
    return {
      key: `compiler:${issue.code || "error"}:${i}`,
      kind: "compiler",
      message: issue.message,
      ids,
      edgeIndex,
      path: subject.path,
      fixes: issue.supportedFixes || [],
    };
  });
}
