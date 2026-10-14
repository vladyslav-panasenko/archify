import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateSchema } from '../renderers/shared/validator.mjs';
import { validatePortablePath, PortablePathError } from '../renderers/shared/portable-path.mjs';
import { resolveOutputPath, pathsAlias } from '../renderers/shared/output-path.mjs';
import { throwDiagnosticError } from '../renderers/shared/diagnostics.mjs';
import { writeHtml } from '../renderers/shared/cli.mjs';
import { createOwnedTempDirectory } from '../renderers/shared/owned-temp-directory.mjs';
import { esc, serializeScriptJson } from '../renderers/shared/utils.mjs';
import { viewerCatalog, resolveLocale, registerLocale } from '../renderers/shared/i18n.mjs';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const collections = {
  architecture: 'components', workflow: 'nodes', sequence: 'participants',
  dataflow: 'nodes', lifecycle: 'states', erd: 'entities', tree: 'nodes',
  class: 'types', timeline: 'events', waterfall: 'spans',
};

function invalid(code, message, subject, evidence = {}, supportedFixes = ['repair the publication manifest and retry']) {
  throwDiagnosticError(message, [{ code: `publication/${code}`, message, subject, evidence, supportedFixes }]);
}

export function validatePublication(manifest) {
  validateSchema('publication', manifest);
  try {
    validatePortablePath(manifest.output, { profile: 'output' });
  } catch (error) {
    if (!(error instanceof PortablePathError)) throw error;
    invalid('output-path', `Invalid publication output: ${error.message}`, { path: '/output' }, { output: manifest.output, reason: error.reason });
  }
  const ids = new Set();
  const sources = new Set();
  for (const [index, entry] of manifest.diagrams.entries()) {
    const subject = { path: `/diagrams/${index}`, diagram: entry.id };
    try {
      validatePortablePath(entry.source, { profile: 'archive' });
    } catch (error) {
      if (!(error instanceof PortablePathError)) throw error;
      invalid('source-path', `Invalid diagram source: ${error.message}`, subject, { source: entry.source, reason: error.reason });
    }
    if (!/\.json$/i.test(entry.source)) invalid('source-path', 'Diagram sources must be JSON files.', subject);
    if (ids.has(entry.id)) invalid('duplicate-id', `Duplicate diagram ID "${entry.id}".`, subject);
    if (sources.has(entry.source)) invalid('duplicate-source', `Duplicate diagram source "${entry.source}".`, subject);
    ids.add(entry.id);
    sources.add(entry.source);
  }
  if (!ids.has(manifest.initial_diagram)) {
    invalid('initial-diagram', 'The initial diagram does not exist.', { path: '/initial_diagram' }, { diagram: manifest.initial_diagram });
  }
  const linked = new Set();
  for (const [index, link] of manifest.links.entries()) {
    const subject = { path: `/links/${index}` };
    if (!ids.has(link.from.diagram) || !ids.has(link.to.diagram)) {
      invalid('link-diagram', 'A navigation link references a missing diagram.', subject, link);
    }
    const key = `${link.from.diagram}\0${link.from.component}`;
    if (linked.has(key)) invalid('duplicate-link', 'A component can have only one destination.', subject, link.from);
    linked.add(key);
  }
  return manifest;
}

function readJson(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (!error.code) throw error;
    invalid('source-read', `Could not read "${file}": ${error.message}`, { input: file }, { systemCode: error.code });
  }
  try {
    return { document: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex') };
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    invalid('source-json', `Invalid JSON in "${file}": ${error.message}`, { input: file });
  }
}

export async function loadPublication(manifestPath) {
  manifestPath = path.resolve(manifestPath);
  const input = readJson(manifestPath);
  const manifest = validatePublication(input.document);
  const base = fs.realpathSync.native(path.dirname(manifestPath));
  const diagrams = [];
  for (const entry of manifest.diagrams) {
    const sourcePath = path.resolve(base, ...entry.source.split('/'));
    let physical;
    try {
      physical = fs.realpathSync.native(sourcePath);
    } catch (error) {
      if (!error.code) throw error;
      invalid('source-read', `Could not resolve "${entry.source}": ${error.message}`, { diagram: entry.id, input: sourcePath }, { systemCode: error.code });
    }
    const relative = path.relative(base, physical);
    if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
      invalid('source-containment', 'Diagram sources must remain inside the publication folder.', { diagram: entry.id, input: sourcePath });
    }
    if (!fs.statSync(physical).isFile()) invalid('source-read', 'Diagram source is not a regular file.', { input: sourcePath });
    if (diagrams.some(previous => pathsAlias(previous.sourcePath, sourcePath))) {
      invalid('duplicate-source', 'Two diagram entries reference the same source file.', { diagram: entry.id, input: sourcePath });
    }
    const { document, sha256: sourceSha256 } = readJson(sourcePath);
    if (!Object.hasOwn(collections, document?.diagram_type)) {
      invalid('diagram-type', 'Unsupported publication diagram type.', { diagram: entry.id, input: sourcePath }, { type: document?.diagram_type });
    }
    validateSchema(document.diagram_type, document);
    const nodeIds = new Set();
    for (const node of document[collections[document.diagram_type]]) {
      if (nodeIds.has(node.id)) invalid('duplicate-component', `Duplicate component ID "${node.id}".`, { diagram: entry.id, input: sourcePath });
      nodeIds.add(node.id);
    }
    diagrams.push({ ...entry, sourcePath, sourceSha256, document });
  }
  for (const [index, link] of manifest.links.entries()) {
    const entry = diagrams.find(diagram => diagram.id === link.from.diagram);
    const nodes = entry.document[collections[entry.document.diagram_type]];
    if (!nodes.some(node => node.id === link.from.component)) {
      invalid('link-component', `Component "${link.from.component}" does not exist in "${entry.id}".`, { path: `/links/${index}/from/component`, diagram: entry.id }, link.from);
    }
  }
  return { manifest, diagrams, manifestPath, manifestSha256: input.sha256 };
}

export function renderPublicationHtml(manifest, diagrams) {
  const initial = diagrams.find(diagram => diagram.id === manifest.initial_diagram);
  const locale = resolveLocale(initial.document.meta.locale);
  registerLocale(locale, initial.document.meta.translations);
  const messages = viewerCatalog(locale);
  const text = key => messages[`viewer.publication.${key}`];
  const shell = fs.readFileSync(path.join(skillRoot, 'publication', 'shell.js'), 'utf8');
  const bridge = fs.readFileSync(path.join(skillRoot, 'publication', 'reader-bridge.js'), 'utf8');
  const css = fs.readFileSync(path.join(skillRoot, 'publication', 'publication.css'), 'utf8');
  const data = {
    title: manifest.title, initial: manifest.initial_diagram,
    diagrams: diagrams.map(({ id, label, c4_level, html }) => ({
      id, label, c4_level, html,
      links: manifest.links.filter(link => link.from.diagram === id).map(link => ({
        component: link.from.component, target: link.to.diagram,
        label: manifest.diagrams.find(entry => entry.id === link.to.diagram).label,
      })),
    })),
    bridge, messages: {
      explore: text('explore'), loading: text('loading'),
      copy: text('copy'), copied: text('copied'), copyFailed: text('copyFailed'),
      invalidAddress: text('invalidAddress'), readerFailed: text('readerFailed'),
      previewAddress: text('previewAddress'),
    },
  };
  return `<!doctype html>
<html lang="${esc(locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(manifest.title)}</title><style>${css}</style></head>
<body><header class="publication-header"><h1>${esc(manifest.title)}</h1>
<div class="publication-actions"><button id="publication-back" type="button" disabled>${esc(text('back'))}</button>
<button id="publication-copy" type="button">${esc(text('copy'))}</button></div></header>
<nav id="publication-tabs" role="tablist" aria-label="${esc(text('diagrams'))}"></nav>
<p id="publication-status" role="status" aria-live="polite"></p>
<main id="publication-readers"></main>
<script id="publication-data" type="application/json">${serializeScriptJson(data)}</script>
<script>${shell}</script></body></html>
`;
}

export async function compilePublication(manifestPath, outputPath) {
  const loaded = await loadPublication(manifestPath);
  const { manifest, diagrams } = loaded;
  const base = path.dirname(loaded.manifestPath);
  const outputRequest = {
    requestedOutput: outputPath,
    authoredOutput: manifest.output,
    inputPaths: [loaded.manifestPath, ...diagrams.map(diagram => diagram.sourcePath)],
    cwd: base,
  };
  const { outputPath: output } = resolveOutputPath(outputRequest);
  const temporary = createOwnedTempDirectory('archify-publication-');
  try {
    for (const [index, entry] of diagrams.entries()) {
      const destination = path.join(temporary.path, `${index}.html`);
      const result = spawnSync(process.execPath, [
        path.join(skillRoot, 'renderers', entry.document.diagram_type, `render-${entry.document.diagram_type}.mjs`),
        entry.sourcePath, destination,
      ], {
        encoding: 'utf8', cwd: base, maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, ARCHIFY_DIAGNOSTIC_FORMAT: 'json' },
      });
      if (result.error || result.status !== 0) {
        let diagnostics;
        try { diagnostics = JSON.parse(result.stderr).diagnostics; }
        catch (error) { if (!(error instanceof SyntaxError)) throw error; }
        if (diagnostics?.length) {
          throwDiagnosticError(`Could not compile diagram "${entry.id}".`, diagnostics.map(diagnostic => ({
            ...diagnostic, subject: { ...diagnostic.subject, publicationDiagram: entry.id },
          })));
        }
        invalid('render', `Could not compile diagram "${entry.id}": ${result.error?.message || result.stderr || result.signal || result.status}`, { diagram: entry.id, input: entry.sourcePath });
      }
      entry.html = fs.readFileSync(destination, 'utf8');
    }
    for (const input of [
      { file: loaded.manifestPath, sha256: loaded.manifestSha256 },
      ...diagrams.map(entry => ({ file: entry.sourcePath, sha256: entry.sourceSha256 })),
    ]) {
      const current = readJson(input.file);
      if (current.sha256 !== input.sha256) {
        invalid('input-changed', 'Publication sources changed while rendering. Save the current files and rebuild.', { input: input.file },
          { expectedSha256: input.sha256, actualSha256: current.sha256 });
      }
    }
    const html = renderPublicationHtml(manifest, diagrams);
    writeHtml({ outPath: output, html, outputRequest });
    return { ok: true, output, diagramCount: diagrams.length, linkCount: manifest.links.length };
  } finally {
    await temporary.cleanup();
  }
}
