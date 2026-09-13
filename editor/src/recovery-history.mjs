import { history } from "./document.mjs";
export function packHistory(state) {
  const past = state.past.slice(-20),
    future = state.future.slice(0, 20);
  while (past.length + future.length > 20) {
    if (past.length >= future.length) past.shift();
    else future.pop();
  }
  while (
    JSON.stringify({ past, future }).length > 1024 * 1024 &&
    (past.length || future.length)
  ) {
    if (past.length >= future.length) past.shift();
    else future.pop();
  }
  return { past, future };
}
export async function restoreHistory(recovery, validate) {
  const fallback = history(recovery.document),
    value = recovery.historyData;
  if (!value) return fallback;
  if (
    !Array.isArray(value.past) ||
    !Array.isArray(value.future) ||
    value.past.length + value.future.length > 20 ||
    JSON.stringify(value).length > 1024 * 1024
  )
    return fallback;
  try {
    for (const snapshot of [...value.past, ...value.future])
      await validate(snapshot);
    return {
      past: value.past,
      present: recovery.document,
      future: value.future,
    };
  } catch {
    return fallback;
  }
}
