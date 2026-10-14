(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('publication-data').textContent);
  const tabs = document.getElementById('publication-tabs');
  const stage = document.getElementById('publication-readers');
  const status = document.getElementById('publication-status');
  const back = document.getElementById('publication-back');
  const copy = document.getElementById('publication-copy');
  const records = new Map();
  const session = `${Date.now()}-${Math.random()}`;
  let active = null;
  let index = 0;
  let lastHash = '';
  const durableAddress = ['file:', 'http:', 'https:'].includes(location.protocol);
  if (!durableAddress) {
    copy.disabled = true;
    copy.title = data.messages.previewAddress;
  }

  function address(id, reader) {
    const params = new URLSearchParams({ diagram: id });
    if (reader) params.set('reader', reader);
    return `#${params}`;
  }
  function state(record, snapshot = record.snapshot) {
    return { publication: session, index, diagram: record.id, reader: snapshot?.reader || '', snapshot };
  }
  function remember(record, snapshot) {
    record.snapshot = snapshot;
    if (active !== record) return;
    const value = state(record);
    history.replaceState(value, '', address(record.id, value.reader));
    lastHash = location.hash;
  }
  function send(record, command) {
    if (record.ready) record.frame.contentWindow.postMessage({ kind: 'archify-publication-command', ...command }, '*');
  }
  function restoreReader(record) {
    if (!record.ready || !record.restorePending) return;
    clearTimeout(record.restoreTimer);
    record.restoreTimer = setTimeout(() => {
      if (record.restorePending && record === active) status.textContent = data.messages.readerFailed;
    }, 20000);
    send(record, { action: 'restore', snapshot: record.snapshot });
  }
  function ensureReader(record) {
    if (record.frame) return;
    const frame = document.createElement('iframe');
    frame.title = record.label;
    frame.setAttribute('sandbox', 'allow-scripts allow-downloads');
    frame.setAttribute('allow', 'clipboard-write');
    record.frame = frame;
    const config = {
      id: record.id, links: record.links, messages: data.messages,
      readingLink: durableAddress
        ? location.href.replace(/#.*$/, '') + `#diagram=${encodeURIComponent(record.id)}&reader={state}` : '',
    };
    const json = JSON.stringify(config).replaceAll('<', '\\u003c').replaceAll('&', '\\u0026');
    const script = `<script id="publication-reader-config" type="application/json">${json}<\/script><script>${data.bridge}<\/script>`;
    const html = record.html.replace('</body>', `${script}</body>`);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    record.url = URL.createObjectURL(blob);
    frame.src = record.url + (record.snapshot?.reader ? `#${record.snapshot.reader}` : '');
    record.panel.appendChild(frame);
    record.timer = setTimeout(() => {
      if (!record.ready && active === record) status.textContent = data.messages.readerFailed;
    }, 20000);
  }
  function activate(id, snapshot, push) {
    const next = records.get(id);
    if (!next) {
      status.textContent = data.messages.invalidAddress;
      return false;
    }
    if (active && push && active === next) return true;
    if (snapshot) next.snapshot = snapshot;
    if (active) {
      send(active, { action: 'visibility', visible: false });
      active.panel.hidden = true;
      active.tab.setAttribute('aria-selected', 'false');
      active.tab.tabIndex = -1;
    }
    active = next;
    next.restorePending = !!next.snapshot;
    next.panel.hidden = false;
    next.tab.setAttribute('aria-selected', 'true');
    next.tab.tabIndex = 0;
    if (push) index += 1;
    const value = state(next);
    history[push ? 'pushState' : 'replaceState'](value, '', address(id, value.reader));
    lastHash = location.hash;
    back.disabled = index === 0;
    status.textContent = next.ready && !next.restorePending ? '' : data.messages.loading;
    ensureReader(next);
    send(next, { action: 'visibility', visible: true });
    restoreReader(next);
    return true;
  }
  for (const entry of data.diagrams) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `publication-tab-${entry.id}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('aria-controls', `publication-panel-${entry.id}`);
    tab.tabIndex = -1;
    tab.textContent = entry.label;
    if (entry.c4_level) {
      const level = document.createElement('span');
      level.className = 'publication-level';
      level.textContent = entry.c4_level;
      tab.appendChild(level);
    }
    const panel = document.createElement('section');
    panel.className = 'publication-panel';
    panel.id = `publication-panel-${entry.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.hidden = true;
    const record = { ...entry, tab, panel, ready: false, snapshot: null };
    records.set(entry.id, record);
    tabs.appendChild(tab);
    stage.appendChild(panel);
    tab.addEventListener('click', () => activate(entry.id, null, true));
    tab.addEventListener('keydown', event => {
      const buttons = Array.from(tabs.children);
      let destination;
      if (event.key === 'ArrowRight') destination = (buttons.indexOf(tab) + 1) % buttons.length;
      if (event.key === 'ArrowLeft') destination = (buttons.indexOf(tab) + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') destination = 0;
      if (event.key === 'End') destination = buttons.length - 1;
      if (destination === undefined) return;
      event.preventDefault();
      buttons[destination].focus();
      buttons[destination].click();
    });
  }
  window.addEventListener('message', event => {
    const record = Array.from(records.values()).find(entry => entry.frame?.contentWindow === event.source);
    const message = event.data;
    if (!record || !message || message.kind !== 'archify-publication-reader' || message.id !== record.id) return;
    if (message.action === 'error') {
      if (record === active) status.textContent = data.messages.readerFailed;
      console.error('Archify publication reader:', message.message);
      return;
    }
    if (message.action === 'ready') {
      record.ready = true;
      clearTimeout(record.timer);
      if (record.url) { URL.revokeObjectURL(record.url); record.url = null; }
      send(record, { action: 'visibility', visible: record === active });
      restoreReader(record);
      if (record === active && !record.restorePending) status.textContent = '';
    } else if (message.action === 'restored' && message.snapshot) {
      record.restorePending = false;
      clearTimeout(record.restoreTimer);
      remember(record, message.snapshot);
      if (record === active) status.textContent = '';
    } else if (message.action === 'state' && message.snapshot) {
      if (!record.restorePending) remember(record, message.snapshot);
    } else if (message.action === 'navigate' && record === active) {
      if (!record.links.some(link => link.component === message.component && link.target === message.target)) return;
      remember(record, message.snapshot);
      activate(message.target, null, true);
      records.get(message.target).tab.focus();
    }
  });
  function restoreAddress() {
    const params = new URLSearchParams(location.hash.slice(1));
    const id = params.get('diagram') || data.initial;
    if (!records.has(id)) {
      status.textContent = data.messages.invalidAddress;
      return;
    }
    const saved = history.state;
    if (saved?.publication === session && saved.diagram === id && saved.reader === (params.get('reader') || '')) {
      index = saved.index;
      activate(id, saved.snapshot, false);
    } else {
      index = 0;
      activate(id, { reader: params.get('reader') || '' }, false);
    }
  }
  window.addEventListener('popstate', restoreAddress);
  window.addEventListener('hashchange', () => {
    if (lastHash !== location.hash) restoreAddress();
  });
  back.addEventListener('click', () => { if (index > 0) history.back(); });
  copy.addEventListener('click', async () => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(location.href);
        copied = true;
      }
    } catch (error) {
      console.warn('Publication clipboard access failed; trying local copy.', error);
    }
    if (!copied) {
      const field = document.createElement('textarea');
      field.value = location.href;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      try { copied = document.execCommand('copy'); }
      catch (error) { console.error('Publication copy failed.', error); }
      finally { field.remove(); }
    }
    status.textContent = copied ? data.messages.copied : data.messages.copyFailed;
  });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    for (const record of records.values()) {
      clearTimeout(record.timer);
      clearTimeout(record.restoreTimer);
      if (record.url) URL.revokeObjectURL(record.url);
    }
  });
  restoreAddress();
})();
