import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'parse5';
import { validatePublication, loadPublication, compilePublication } from '../archify/publication/publication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = path.join(root, 'archify', 'examples', 'web-app.publication.json');
const cli = path.join(root, 'archify', 'bin', 'archify.mjs');
const manifest = () => JSON.parse(fs.readFileSync(example, 'utf8'));
function diagnostic(code) {
  return error => {
    assert.ok(error.archifyDiagnostics?.some(entry => entry.code === code), error.message);
    return true;
  };
}
function elements(node) {
  return [node, ...(node.childNodes || []).flatMap(elements)];
}
function attr(node, name) {
  return node.attrs?.find(entry => entry.name === name)?.value;
}

test('publication contract rejects ambiguous IDs, destinations, paths and unknown properties', () => {
  assert.equal(validatePublication(manifest()).diagrams.length, 4);
  const cases = [
    ['publication/duplicate-id', value => value.diagrams[1].id = 'overview'],
    ['publication/duplicate-source', value => value.diagrams[1].source = value.diagrams[0].source],
    ['publication/initial-diagram', value => value.initial_diagram = 'missing'],
    ['publication/link-diagram', value => value.links[0].to.diagram = 'missing'],
    ['publication/duplicate-link', value => value.links.push(value.links[0])],
    ['publication/source-path', value => value.diagrams[0].source = '../outside.json'],
    ['publication/source-path', value => value.diagrams[0].source = 'C:\\outside.json'],
    ['publication/source-path', value => value.diagrams[0].source = 'https://example.test/source.json'],
    ['schema/additionalProperties', value => value.parent = 'invented'],
  ];
  for (const [code, edit] of cases) {
    const value = manifest();
    edit(value);
    assert.throws(() => validatePublication(value), diagnostic(code));
  }
});

test('publication loading preserves independently scoped IDs and rejects missing components and source files', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-publication-input-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const document = {
    schema_version: 1, diagram_type: 'architecture',
    meta: { title: 'Reusable API', output: 'api.html' },
    components: [{ id: 'api', label: 'API', type: 'backend', pos: [40, 40] }],
  };
  fs.writeFileSync(path.join(directory, 'one.json'), JSON.stringify(document));
  fs.writeFileSync(path.join(directory, 'two.json'), JSON.stringify(document));
  const value = {
    schema_version: 1, title: 'Publication', output: 'publication.html', initial_diagram: 'one',
    diagrams: [{ id: 'one', label: 'One', source: 'one.json' }, { id: 'two', label: 'Two', source: 'two.json' }],
    links: [{ from: { diagram: 'one', component: 'api' }, to: { diagram: 'two' } }],
  };
  const file = path.join(directory, 'publication.json');
  const save = () => fs.writeFileSync(file, JSON.stringify(value));
  save();
  assert.equal((await loadPublication(file)).diagrams.length, 2);
  value.links[0].from.component = 'missing';
  save();
  await assert.rejects(loadPublication(file), diagnostic('publication/link-component'));
  value.links[0].from.component = 'api';
  value.diagrams[1].source = 'missing.json';
  save();
  await assert.rejects(loadPublication(file), diagnostic('publication/source-read'));
});

test('publication CLI produces deterministic offline mixed diagrams without modifying sources', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-publication-output-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const loaded = await loadPublication(example);
  const originals = loaded.diagrams.map(entry => fs.readFileSync(entry.sourcePath));
  const output = path.join(directory, 'publication.html');
  const receipt = await compilePublication(example, output);
  assert.deepEqual(receipt, { ok: true, output, diagramCount: 4, linkCount: 5 });
  const html = fs.readFileSync(output, 'utf8');
  const nodes = elements(parse(html));
  const dataNode = nodes.find(node => attr(node, 'id') === 'publication-data');
  const data = JSON.parse(dataNode.childNodes[0].value);
  assert.equal(data.diagrams.length, 4);
  for (const entry of data.diagrams) {
    const native = elements(parse(entry.html));
    assert.ok(native.some(node => node.tagName === 'svg' && attr(node, 'role') === 'img'));
    assert.ok(!native.some(node => node.tagName === 'script' && attr(node, 'src')));
  }
  loaded.diagrams.forEach((entry, index) => assert.deepEqual(fs.readFileSync(entry.sourcePath), originals[index]));
  const result = spawnSync(process.execPath, [cli, 'publication', example, output, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).diagramCount, 4);
  assert.equal(fs.readFileSync(output, 'utf8'), html);
  const inputBytes = fs.readFileSync(example);
  const alias = spawnSync(process.execPath, [cli, 'publication', example, example, '--json'], { encoding: 'utf8' });
  assert.notEqual(alias.status, 0);
  assert.equal(JSON.parse(alias.stdout).ok, false);
  assert.deepEqual(fs.readFileSync(example), inputBytes);
  const invalid = spawnSync(process.execPath, [cli, 'publication', '--bad', '--json'], { encoding: 'utf8' });
  assert.notEqual(invalid.status, 0);
  assert.equal(JSON.parse(invalid.stdout).ok, false);
});

test('invalid publication sources preserve the existing output', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-publication-preserve-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const value = manifest();
  value.diagrams = [{ id: 'bad', label: 'Bad', source: 'bad.json' }];
  value.initial_diagram = 'bad';
  value.links = [];
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(value));
  fs.writeFileSync(path.join(directory, 'bad.json'), '{"schema_version":999}');
  const output = path.join(directory, 'existing.html');
  fs.writeFileSync(output, 'previous publication');
  await assert.rejects(compilePublication(path.join(directory, 'manifest.json'), output));
  assert.equal(fs.readFileSync(output, 'utf8'), 'previous publication');
  fs.writeFileSync(path.join(directory, 'bad.json'), JSON.stringify({
    schema_version: 1, diagram_type: 'architecture',
    meta: { title: 'Overlapping', output: 'bad.html', quality_profile: 'showcase' },
    components: [
      { id: 'one', label: 'One', type: 'backend', pos: [40, 40] },
      { id: 'two', label: 'Two', type: 'backend', pos: [40, 40] },
    ],
  }));
  await assert.rejects(compilePublication(path.join(directory, 'manifest.json'), output), error => {
    assert.ok(error.archifyDiagnostics?.length, 'renderer failures retain repair diagnostics');
    return true;
  });
  assert.equal(fs.readFileSync(output, 'utf8'), 'previous publication');
});

test('publication rejects aliased sources and directory links escaping the source folder', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-publication-containment-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const base = path.join(directory, 'base');
  const outside = path.join(directory, 'outside');
  fs.mkdirSync(base);
  fs.mkdirSync(outside);
  const document = {
    schema_version: 1, diagram_type: 'architecture',
    meta: { title: 'API', output: 'api.html' },
    components: [{ id: 'api', type: 'backend', label: 'API', pos: [40, 40] }],
  };
  fs.writeFileSync(path.join(base, 'one.json'), JSON.stringify(document));
  fs.linkSync(path.join(base, 'one.json'), path.join(base, 'alias.json'));
  const value = {
    schema_version: 1, title: 'Publication', output: 'publication.html', initial_diagram: 'one',
    diagrams: [{ id: 'one', label: 'One', source: 'one.json' }, { id: 'two', label: 'Two', source: 'alias.json' }],
    links: [],
  };
  const file = path.join(base, 'publication.json');
  fs.writeFileSync(file, JSON.stringify(value));
  await assert.rejects(loadPublication(file), diagnostic('publication/duplicate-source'));
  fs.writeFileSync(path.join(outside, 'two.json'), JSON.stringify(document));
  fs.symlinkSync(outside, path.join(base, 'escape'), 'junction');
  value.diagrams[1].source = 'escape/two.json';
  fs.writeFileSync(file, JSON.stringify(value));
  await assert.rejects(loadPublication(file), diagnostic('publication/source-containment'));
});

test('a source changed during rendering cannot replace an existing publication', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-publication-changed-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'source.json'), JSON.stringify({
    schema_version: 1, diagram_type: 'architecture',
    meta: { title: 'Saved source', output: 'source.html' },
    components: [{ id: 'api', type: 'backend', label: 'API', pos: [40, 40] }],
  }));
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
    schema_version: 1, title: 'Publication', output: 'publication.html', initial_diagram: 'one',
    diagrams: [{ id: 'one', label: 'One', source: 'source.json' }], links: [],
  }));
  const injected = path.join(directory, 'change-source.mjs');
  fs.writeFileSync(injected, `
    import fs from 'node:fs';
    const file = process.argv[2];
    const document = JSON.parse(fs.readFileSync(file, 'utf8'));
    document.meta.title = 'Concurrent change';
    fs.writeFileSync(file, JSON.stringify(document));
  `);
  const output = path.join(directory, 'publication.html');
  fs.writeFileSync(output, 'previous publication');
  const previous = process.env.NODE_OPTIONS;
  try {
    process.env.NODE_OPTIONS = `${previous || ''} --import=${pathToFileURL(injected).href}`;
    await assert.rejects(compilePublication(path.join(directory, 'manifest.json')), diagnostic('publication/input-changed'));
  } finally {
    if (previous === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = previous;
  }
  assert.equal(fs.readFileSync(output, 'utf8'), 'previous publication');
});
