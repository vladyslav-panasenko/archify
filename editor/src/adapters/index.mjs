import { workflow } from './workflow.mjs';
const adapters = { workflow };
export const adapterFor = document => adapters[document?.diagram_type];
export const supportedTypes = ['architecture', ...Object.keys(adapters)];
export const nodeKey = document => adapterFor(document)?.nodesKey || 'components';
export const edgeKey = document => adapterFor(document)?.edgesKey || 'connections';
export const sourceNodes = document => document?.[nodeKey(document)] || [];
export const connections = document => document?.[edgeKey(document)] || [];
export const editingOptions = document => adapterFor(document) || { minSize: [40, 24], routes: ['auto', 'straight', 'orthogonal-h', 'orthogonal-v'] };
