import { documentChanges } from './review.mjs';
import { undo, redo } from './document.mjs';

export function describeEdit(before, after) {
  const changes = documentChanges(before, after);
  if (!changes.length) return 'No changes';
  const fields = changes.map(c => c.path.at(-1));
  const count = new Set(changes.map(c => c.path.slice(0, 2).join('/'))).size;
  if (fields.every(f => ['pos','row','col','stage','yOffset','y'].includes(f)))
    return `Move ${count} item${count === 1 ? '' : 's'}`;
  if (fields.every(f => ['size','width','height'].includes(f))) return `Resize ${count} item${count === 1 ? '' : 's'}`;
  if (fields.every(f => ['via','route','fromSide','toSide','labelAt','labelDx','labelDy'].includes(f))) return `Edit ${count} connection route${count === 1 ? '' : 's'}`;
  if (changes.every(c => c.path.length === 2 && c.before === undefined)) return `Add ${count} item${count === 1 ? '' : 's'}`;
  if (changes.every(c => c.path.length === 2 && c.after === undefined)) return `Remove ${count} item${count === 1 ? '' : 's'}`;
  if (fields.every(f => ['label','title','description'].includes(f))) return `Edit ${count} label${count === 1 ? '' : 's'}`;
  if (changes.every(c => ['meta','theme','viewBox','layout'].includes(c.path[0]))) return 'Change document settings';
  return `Update document · ${changes.length} change${changes.length === 1 ? '' : 's'}`;
}
export function historyEntries(state) {
  const snapshots = [...state.past, state.present, ...state.future];
  return snapshots.map((doc, index) => ({index, label:index ? describeEdit(snapshots[index-1],doc) : 'Initial retained state', status:index < state.past.length ? 'Past' : index === state.past.length ? 'Current' : 'Future'}));
}
export function jumpHistory(state, index) {
  if (!Number.isInteger(index) || index < 0 || index > state.past.length + state.future.length) throw new Error('History position is unavailable.');
  let next = state;
  while (next.past.length > index) next = undo(next);
  while (next.past.length < index) next = redo(next);
  return next;
}
