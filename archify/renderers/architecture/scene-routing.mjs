import { createRouter } from './routing.mjs';
import { asArray, labelPoint } from '../shared/geometry.mjs';
import { reservedLabelRect } from '../shared/automatic-labels.mjs';
import { textUnits } from '../shared/text-units.mjs';

export function architectureBoundaryRect(arch, boundary, components) {
  const members = asArray(boundary.wraps).map((id) => components.get(id)).filter(Boolean);
  if (!members.length) return null;
  const minX = Math.min(...members.map((member) => member.x));
  const minY = Math.min(...members.map((member) => member.y));
  const maxX = Math.max(...members.map((member) => member.x + member.width));
  const maxY = Math.max(...members.map((member) => member.y + member.height));
  const pad = boundary.pad ?? 30;
  const topPad = Math.max(pad, 22, arch.meta?.quality_profile ? 24 : 0);
  return {
    ...boundary,
    x: minX - pad,
    y: minY - topPad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + topPad + 20,
    memberTop: minY,
  };
}

export function connectionLabelBoxAt(conn, [lx, ly]) {
  const width = Math.max(30, textUnits(conn.label) * 4.8 + 10);
  return { x: lx - width / 2, y: ly - 10, width, height: 14, lx, ly };
}

export function createArchitectureRouter(arch, components, boundaries = asArray(arch.boundaries)
  .map((boundary) => architectureBoundaryRect(arch, boundary, components)).filter(Boolean)) {
  return createRouter(components, arch.connections, {
    distinctAutomaticPorts: true,
    preferReadableRoutes: true,
    // Only an intrinsic canvas can grow to contain an extra return corridor.
    readabilityBottomMargin: arch.meta?.viewBox ? 0 : 24,
    frames: boundaries.map((boundary) => ({
      ...boundary,
      radius: boundary.kind === 'security-group' ? 8 : 12,
    })),
    labelRectFor: (conn, points, { routes, labels }) => (conn.label ? reservedLabelRect({
      label: { relation: conn, label: conn.label, ...connectionLabelBoxAt(conn, labelPoint(conn, points)) },
      points,
      routes: routes.map((route, index) => ({ relationIndex: index, points: route })),
      labels,
      components: [...components.values()],
    }) : null),
  });
}
