export const documentLimits = Object.freeze({ bytes: 5 * 1024 * 1024, depth: 100, values: 200000 });

// Run before recursive validators, cloning, serialization, or layout work.
export function assertResourceLimits(value) {
  const stack = [[value, 0]], seen = new Set();
  let count = 0;
  while (stack.length) {
    const [item, depth] = stack.pop();
    if (++count > documentLimits.values) throw new Error("Document exceeds the 200,000-value limit. Split it into smaller diagrams.");
    if (depth > documentLimits.depth) throw new Error("JSON nesting exceeds the 100-level limit. Reduce nested metadata.");
    if (item && typeof item === "object") {
      if (seen.has(item)) throw new Error("Document must be an acyclic JSON tree.");
      seen.add(item);
      for (const child of Object.values(item)) stack.push([child, depth + 1]);
    } else if (typeof item === "number" && !Number.isFinite(item)) {
      throw new Error("JSON numbers must be finite.");
    }
  }
  return value;
}
