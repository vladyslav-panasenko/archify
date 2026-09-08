import { components, moveComponents } from './document.mjs';

export const arrangements = {
  left: 'Align left', centerX: 'Align horizontal centers', right: 'Align right',
  top: 'Align top', centerY: 'Align vertical centers', bottom: 'Align bottom',
  distributeX: 'Distribute horizontally', distributeY: 'Distribute vertically',
};

export function arrange(document, ids, action) {
  if (document.diagram_type !== 'architecture') throw new Error('Free alignment is available for architecture diagrams.');
  if (!(action in arrangements)) throw new Error('Unknown arrangement.');
  const selected = components(document).filter(c => ids.includes(c.id));
  const distribute = action.startsWith('distribute');
  if (selected.length < (distribute ? 3 : 2)) throw new Error(distribute ? 'Select at least three items.' : 'Select at least two items.');
  const axis = ['top', 'centerY', 'bottom', 'distributeY'].includes(action) ? 1 : 0;
  const start = Math.min(...selected.map(c => c.pos[axis]));
  const end = Math.max(...selected.map(c => c.pos[axis] + c.size[axis]));
  const positions = new Map();
  if (distribute) {
    const ordered = selected.toSorted((a,b) => a.pos[axis] - b.pos[axis]);
    const gap = (end - start - selected.reduce((sum,c) => sum + c.size[axis], 0)) / (selected.length - 1);
    if (gap < 0) throw new Error('Spread the outer items farther apart before distributing.');
    let cursor = start;
    for (const c of ordered) { const p = [...c.pos]; p[axis] = cursor; positions.set(c.id,p); cursor += c.size[axis] + gap; }
  } else {
    for (const c of selected) {
      const p = [...c.pos];
      p[axis] = action.startsWith('center') ? (start + end - c.size[axis]) / 2 : ['right','bottom'].includes(action) ? end - c.size[axis] : start;
      positions.set(c.id,p);
    }
  }
  return moveComponents(document, positions);
}
