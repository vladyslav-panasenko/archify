import { assertDocument, commit, serialize } from "./document.mjs";
export function commitEditingTransaction(state, candidate, validate = assertDocument) {
  validate(candidate);
  if (serialize(candidate) === serialize(state.present)) return state;
  return commit(state, candidate);
}
