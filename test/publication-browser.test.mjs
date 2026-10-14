import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compilePublication } from '../archify/publication/publication.mjs';
import { serializeScriptJson } from '../archify/renderers/shared/utils.mjs';
import { ChromeVisualBrowser, findChrome } from '../archify/bin/visual-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.ARCHIFY_CHROME ? findChrome() : null;

function instrumentReaders(output) {
  const probeScript = `<script>
    addEventListener('message', async event => {
      if (event.source !== parent || event.data?.kind !== 'publication-test-probe') return;
      try {
        const value = await eval(event.data.expression);
        parent.postMessage({kind:'publication-test-result', token:event.data.token, value}, '*');
      } catch (error) {
        parent.postMessage({kind:'publication-test-result', token:event.data.token, error:error.stack}, '*');
      }
    });
  </script>`;
  // Test-only probes reach opaque readers without weakening their sandbox.
  const html = fs.readFileSync(output, 'utf8');
  const dataPattern = /(<script id="publication-data" type="application\/json">)([\s\S]*?)(<\/script>)/;
  fs.writeFileSync(output, html.replace(dataPattern, (_match, start, json, end) => {
    const data = JSON.parse(json);
    for (const diagram of data.diagrams) diagram.html = diagram.html.replace('</body>', probeScript + '</body>');
    return start + serializeScriptJson(data) + end;
  }));
}

test('offline publication supports drill-down, restored history, deep links, keyboard tabs and native exports', {
  skip: chrome ? false : 'Set ARCHIFY_CHROME for publication browser coverage.',
}, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-publication-browser-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'publication.html');
  await compilePublication(path.join(root, 'archify', 'examples', 'web-app.publication.json'), output);
  instrumentReaders(output);
  const browser = new ChromeVisualBrowser(chrome);
  t.after(() => browser.close());
  const session = await browser.sessionPromise;
  const send = (method, params = {}) => browser.cdp.send(method, params, session);
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await browser.cdp.send('Browser.setDownloadBehavior', { behavior: 'deny' });
  const run = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert.equal(result.exceptionDetails, undefined, result.exceptionDetails?.exception?.description);
    return result.result.value;
  };
  const wait = condition => run(`new Promise((resolve, reject) => {
    const start = performance.now();
    function check() {
      if (${condition}) return resolve(true);
      if (performance.now() - start > 10000) return reject(new Error('Publication did not reach expected state: ' + ${JSON.stringify(condition)} + '; status=' + document.getElementById('publication-status').textContent + '; history=' + JSON.stringify(history.state)));
      setTimeout(check, 20);
    } check();
  })`);
  const selected = id => `document.getElementById('publication-tab-${id}').getAttribute('aria-selected') === 'true' && document.getElementById('publication-status').textContent === ''`;
  const probe = (id, expression) => run(`new Promise((resolve, reject) => {
    const frame = document.querySelector('#publication-panel-${id} iframe');
    const token = Math.random();
    const timer = setTimeout(() => { removeEventListener('message', receive); reject(new Error('Reader probe timed out: ${id}')); }, 10000);
    function receive(event) {
      if (event.source !== frame.contentWindow || event.data?.kind !== 'publication-test-result' || event.data.token !== token) return;
      clearTimeout(timer); removeEventListener('message', receive);
      if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data.value);
    }
    addEventListener('message', receive);
    frame.contentWindow.postMessage({kind:'publication-test-probe', token, expression:${JSON.stringify(expression)}}, '*');
  })`);
  const navigate = async url => {
    const blank = browser.cdp.waitFor('Page.loadEventFired', session);
    await send('Page.navigate', { url: 'about:blank' });
    await blank;
    const loaded = browser.cdp.waitFor('Page.loadEventFired', session);
    await send('Page.navigate', { url });
    await loaded;
  };
  await navigate(pathToFileURL(output).href);
  await wait(selected('overview'));
  assert.equal(await run("document.querySelectorAll('iframe').length"), 1, 'readers load lazily');
  assert.equal(await probe('overview', "document.querySelectorAll('[data-publication-navigation]').length"), 0, 'navigation does not overlay component arrows');
  assert.equal(await probe('overview', "document.getElementById('publication-explore').hidden"), true);
  await probe('overview', 'Archify.focus.set("db", {toggle:false}); true');
  await wait("new URLSearchParams(location.hash.slice(1)).get('reader') === 'focus=db'");
  assert.equal(await probe('overview', "document.getElementById('publication-explore').hidden"), true, 'unlinked components have no drill-down link');
  await probe('overview', `(() => {
    document.querySelector('[data-node-id="api"]').dispatchEvent(new MouseEvent('click', {bubbles:true}));
    Archify.view.zoomIn();
    return true;
  })()`);
  await wait("new URLSearchParams(location.hash.slice(1)).get('reader') === 'focus=api' && history.state.snapshot?.camera.scale > 1");
  const saved = await probe('overview', 'Archify.view.state()');
  assert.equal(await probe('overview', 'Archify.focus.active()'), 'api', 'normal node clicks retain focus');
  assert.equal(await probe('overview', "document.getElementById('publication-explore').hidden"), false);
  assert.equal(await probe('overview', "document.getElementById('publication-explore').textContent"), 'Explore inside: API internals');
  assert.equal(await probe('overview', "document.getElementById('publication-explore').previousElementSibling.className"), 'relationship-lens-head');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  assert.equal(await probe('overview', `(async () => {
    await new Promise(requestAnimationFrame);
    Archify.motionGovernor.setMode('live', {persist:false});
    return Archify.motionGovernor.isPaused();
  })()`), false, 'the visible reader can run Live motion');
  await probe('overview', "document.getElementById('publication-explore').focus(); true");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await wait(selected('api'));
  assert.equal(await run("document.getElementById('publication-back').disabled"), false);
  assert.equal(await probe('overview', "document.documentElement.hasAttribute('data-publication-hidden')"), true);
  assert.equal(await probe('overview', 'Archify.motionGovernor.isPaused()'), true);
  await run("document.getElementById('publication-back').click()");
  await wait(selected('overview'));
  await wait("history.state.snapshot?.reader === 'focus=api'");
  const restored = await probe('overview', 'Archify.view.state()');
  assert.deepEqual(restored, saved, 'Back restores the exact camera snapshot');
  assert.equal(await probe('overview', 'Archify.focus.active()'), 'api');
  assert.equal(await probe('overview', 'Archify.motionGovernor.isPaused()'), false, 'Back releases the hidden-reader suspension without changing Live');
  await run("history.forward()");
  await wait(selected('api'));
  await probe('api', 'Archify.focus.set("router", {toggle:false}); true');
  await probe('api', "document.getElementById('publication-explore').click(); true");
  await wait(selected('request'));
  await probe('request', 'Archify.focus.set("api", {toggle:false}); true');
  await wait("new URLSearchParams(location.hash.slice(1)).get('reader') === 'focus=api'");
  const copied = await probe('request', `(async () => {
    let value = null;
    document.execCommand = () => { value = document.querySelector('textarea[readonly]')?.value; return true; };
    const ok = await Archify.focus.copyLink();
    return {ok, value};
  })()`);
  assert.equal(copied.ok, true);
  const address = new URL(copied.value);
  assert.equal(address.protocol, 'file:');
  assert.equal(new URLSearchParams(address.hash.slice(1)).get('diagram'), 'request');
  assert.equal(new URLSearchParams(address.hash.slice(1)).get('reader'), 'focus=api');
  const exported = await probe('request', `(async () => {
    const create = URL.createObjectURL;
    const blobs = [];
    URL.createObjectURL = blob => { blobs.push(blob); return create.call(URL, blob); };
    try {
      await Archify.exportMenu.run('svg');
      const svg = await blobs.find(blob => blob.type.startsWith('image/svg+xml')).text();
      await Archify.exportMenu.run('png');
      const png = blobs.find(blob => blob.type === 'image/png');
      return {
        format: document.documentElement.getAttribute('data-last-export-format'),
        error: document.documentElement.getAttribute('data-last-export-error'),
        svg, pngBytes: png?.size,
        linkVisible: !document.getElementById('publication-explore').hidden
      };
    } finally { URL.createObjectURL = create; }
  })()`);
  assert.equal(exported.error, null);
  assert.equal(exported.format, 'png');
  assert.ok(exported.pngBytes > 1000);
  assert.ok(exported.svg.includes('data-node-id="api"'));
  assert.ok(!exported.svg.includes('publication-explore'), 'canonical export excludes passport navigation');
  assert.equal(exported.linkVisible, true, 'export leaves passport navigation intact');
  assert.equal(await probe('request', `performance.getEntriesByType('resource').every(entry => !/^https?:/.test(entry.name))`), true);
  await navigate(copied.value);
  await wait(selected('request'));
  assert.equal(await probe('request', 'Archify.focus.active()'), 'api', 'shared links restore native state');
  assert.equal(await run("document.getElementById('publication-back').disabled"), true, 'direct entry invents no parent');
  await run("document.getElementById('publication-tab-request').dispatchEvent(new KeyboardEvent('keydown', {key:'End',bubbles:true}))");
  await wait(selected('workflow'));
  assert.equal(await run("document.activeElement.id"), 'publication-tab-workflow');
  await navigate(pathToFileURL(output).href + '#diagram=missing');
  assert.match(await run("document.getElementById('publication-status').textContent"), /unknown diagram/);
  assert.equal(await run("document.querySelectorAll('iframe').length"), 0);

  const corpus = [
    ['dataflow', 'product-analytics.dataflow.json', 'nodes'],
    ['lifecycle', 'agent-run.lifecycle.json', 'states'],
    ['erd', 'orders.erd.json', 'entities'],
    ['class', 'payments.class.json', 'types'],
    ['tree', 'payment-platform.tree.json', 'nodes'],
    ['timeline', 'payment-incident.timeline.json', 'events'],
    ['waterfall', 'checkout-request.waterfall.json', 'spans'],
  ].map(([id, source, collection]) => {
    const document = JSON.parse(fs.readFileSync(path.join(root, 'archify', 'examples', source), 'utf8'));
    fs.writeFileSync(path.join(directory, source), JSON.stringify(document));
    const node = id === 'tree' ? document.nodes.find(node => node.parent) : document[collection][0];
    return { id, source, label: id, node };
  });
  const corpusManifest = {
    schema_version: 1, title: 'Mixed diagram navigation', output: 'mixed.html', initial_diagram: corpus[0].id,
    diagrams: corpus.map(({ id, source, label }) => ({ id, source, label })),
    links: corpus.map((entry, index) => ({
      from: { diagram: entry.id, component: entry.node.id },
      to: { diagram: corpus[(index + 1) % corpus.length].id },
    })),
  };
  const mixedManifest = path.join(directory, 'mixed.json');
  const mixedOutput = path.join(directory, 'mixed.html');
  fs.writeFileSync(mixedManifest, JSON.stringify(corpusManifest));
  await compilePublication(mixedManifest);
  instrumentReaders(mixedOutput);
  await navigate(pathToFileURL(mixedOutput).href);
  for (const entry of corpus) {
    await run(`document.getElementById('publication-tab-${entry.id}').click()`);
    await wait(selected(entry.id));
    const destination = corpus[(corpus.indexOf(entry) + 1) % corpus.length].id;
    const action = await probe(entry.id, `(() => {
      Archify.focus.set(${JSON.stringify(entry.node.id)}, {toggle:false});
      return new Promise(resolve => requestAnimationFrame(() => {
        const link = document.getElementById('publication-explore');
        resolve({visible:!link.hidden, label:link.textContent, tag:link.tagName, href:link.hash,
          arrows:document.querySelectorAll('[data-publication-navigation]').length});
      }));
    })()`);
    assert.equal(action.visible, true, `${entry.id}: linked component exposes passport navigation`);
    assert.equal(action.label, `Explore inside: ${destination}`);
    assert.equal(action.tag, 'A');
    assert.equal(action.href, `#diagram=${destination}`);
    assert.equal(action.arrows, 0);
    await probe(entry.id, "document.getElementById('publication-explore').click(); true");
    await wait(selected(destination));
  }
  await run("document.getElementById('publication-tab-waterfall').click()");
  await wait(selected('waterfall'));
  const previewUrl = await run(`(() => {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelector('#publication-tabs').replaceChildren();
    clone.querySelector('#publication-readers').replaceChildren();
    return URL.createObjectURL(new Blob(['<!doctype html>' + clone.outerHTML], {type:'text/html'})) + location.hash;
  })()`);
  const previewLoaded = browser.cdp.waitFor('Page.loadEventFired', session);
  await send('Page.navigate', { url: previewUrl });
  await previewLoaded;
  await wait(selected('waterfall'));
  assert.equal(await run("document.getElementById('publication-copy').disabled"), true, 'temporary preview links cannot masquerade as shared addresses');
  assert.match(await run("document.getElementById('publication-copy').title"), /temporary/);
  assert.equal(await probe('waterfall', `(async () => {
    Archify.focus.set(${JSON.stringify(corpus.at(-1).node.id)}, {toggle:false});
    return await Archify.focus.copyLink();
  })()`), false, 'native copy also rejects ephemeral preview addresses');
});
