(() => {
  'use strict';
  const config = JSON.parse(document.getElementById('publication-reader-config').textContent);
  const publish = (action, value = {}) => parent.postMessage({
    kind: 'archify-publication-reader', id: config.id, action, ...value,
  }, '*');
  if (!window.Archify?.focus || !Archify.view) {
    publish('error', { message: 'The native reader did not initialize.' });
    return;
  }
  document.documentElement.setAttribute('data-reading-link-template', config.readingLink);
  const svg = document.querySelector('.diagram-container svg');
  const container = document.querySelector('.diagram-container');
  const chip = document.getElementById('focus-chip');
  let releaseMotion = null;
  let restoring = false;
  let frame = 0;
  let restoreGeneration = 0;
  let previousSnapshot = '';
  const badges = [];
  const replace = history.replaceState.bind(history);
  function snapshot() {
    return {
      reader: location.hash.slice(1), camera: Archify.view.state(),
      scroll: [scrollX, scrollY],
      containerScroll: [container.scrollLeft, container.scrollTop],
    };
  }
  function report() {
    frame = 0;
    if (restoring) return;
    syncAction();
    const value = snapshot();
    const serialized = JSON.stringify(value);
    if (serialized !== previousSnapshot) {
      previousSnapshot = serialized;
      publish('state', { snapshot: value });
    }
  }
  function schedule() {
    if (!frame && !restoring) frame = requestAnimationFrame(report);
  }
  // Native readers build pathname-based URLs. Blob readers may change only
  // their fragment; the publication owns the durable external address.
  history.replaceState = (state, title, url) => {
    if (url == null) replace(state, title);
    else {
      const text = String(url);
      const hash = text.includes('#') ? text.slice(text.indexOf('#')) : '';
      replace(state, title, location.href.replace(/#.*$/, '') + hash);
    }
    schedule();
  };
  const style = document.createElement('style');
  style.textContent = `
    [data-publication-hidden] * { animation-play-state: paused !important; }
    [data-publication-navigation] { cursor: pointer; }
    [data-publication-navigation]:focus-visible circle { stroke-width: 3; stroke: var(--text-primary, #38bdf8); }
    .publication-explore { color: var(--text-primary, inherit); background: transparent; border: 1px solid currentColor;
      border-radius: 5px; padding: 5px 8px; font: inherit; cursor: pointer; margin-top: 6px; }
  `;
  document.head.appendChild(style);
  const explore = document.createElement('button');
  explore.type = 'button';
  explore.className = 'publication-explore';
  explore.id = 'publication-explore';
  explore.hidden = true;
  chip.appendChild(explore);
  let activeLink = null;
  function navigate(link) {
    publish('navigate', { component: link.component, target: link.target, snapshot: snapshot() });
  }
  explore.addEventListener('click', event => {
    event.stopPropagation();
    if (activeLink) navigate(activeLink);
  });
  function syncAction() {
    const selected = Archify.focus.active();
    const nextLink = typeof selected === 'string'
      ? config.links.find(link => link.component === selected) : null;
    if (nextLink === activeLink) return;
    activeLink = nextLink;
    explore.hidden = !activeLink;
    if (activeLink) {
      explore.textContent = `${viewerText('viewer.publication.explore')}: ${activeLink.label}`;
      Archify.focus.reposition();
    }
  }
  function positionBadges() {
    const rootMatrix = svg.getCTM();
    if (!rootMatrix) return;
    for (const { node, badge } of badges) {
      const hidden = !!node.closest('[data-tree-hidden]');
      badge.style.display = hidden ? 'none' : '';
      if (hidden) continue;
      const matrix = node.getCTM();
      if (!matrix) continue;
      const local = rootMatrix.inverse().multiply(matrix);
      const box = node.getBBox();
      badge.setAttribute('transform', `matrix(${local.a} ${local.b} ${local.c} ${local.d} ${local.e} ${local.f}) translate(${box.x + box.width - 10} ${box.y + box.height - 10})`);
    }
  }
  for (const link of config.links) {
    const node = Array.from(svg.querySelectorAll('[data-node-id]'))
      .find(element => element.getAttribute('data-node-id') === link.component);
    if (!node) {
      publish('error', { message: `Missing rendered component: ${link.component}` });
      continue;
    }
    const ns = 'http://www.w3.org/2000/svg';
    const badge = document.createElementNS(ns, 'g');
    badge.setAttribute('data-publication-navigation', link.component);
    badge.setAttribute('role', 'button');
    badge.setAttribute('tabindex', '0');
    badge.setAttribute('aria-label', `${viewerText('viewer.publication.explore')}: ${link.label}`);
    const title = document.createElementNS(ns, 'title');
    title.textContent = `${viewerText('viewer.publication.explore')}: ${link.label}`;
    badge.appendChild(title);
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('r', '9');
    circle.setAttribute('fill', 'var(--bg-primary, #111827)');
    circle.setAttribute('stroke', 'var(--accent-cyan, #38bdf8)');
    badge.appendChild(circle);
    const arrow = document.createElementNS(ns, 'path');
    arrow.setAttribute('d', 'M-4 0H4M0-4L4 0 0 4');
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('stroke', 'var(--accent-cyan, #38bdf8)');
    arrow.setAttribute('stroke-width', '1.5');
    badge.appendChild(arrow);
    badge.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      navigate(link);
    });
    badge.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      navigate(link);
    });
    svg.appendChild(badge);
    badges.push({ node, badge });
  }
  positionBadges();
  new MutationObserver(positionBadges).observe(svg, {
    attributes: true, subtree: true, attributeFilter: ['data-tree-hidden'],
  });
  new MutationObserver(schedule).observe(svg, { attributes: true });
  new MutationObserver(schedule).observe(chip, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('scroll', schedule, { passive: true });
  container.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('message', event => {
    const message = event.data;
    if (event.source !== parent || !message || message.kind !== 'archify-publication-command') return;
    if (message.action === 'visibility') {
      if (message.visible) {
        document.documentElement.removeAttribute('data-publication-hidden');
        if (releaseMotion) { releaseMotion(); releaseMotion = null; }
        positionBadges();
      } else {
        document.documentElement.setAttribute('data-publication-hidden', '');
        if (!releaseMotion && Archify.motionGovernor?.suspend) releaseMotion = Archify.motionGovernor.suspend('publication-hidden');
      }
    } else if (message.action === 'restore' && message.snapshot) {
      const saved = message.snapshot;
      const generation = ++restoreGeneration;
      restoring = true;
      replace(null, '', location.href.replace(/#.*$/, '') + (saved.reader ? `#${saved.reader}` : ''));
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (generation !== restoreGeneration) return;
        if (saved.camera) Archify.view.restore(saved.camera);
        if (saved.scroll) window.scrollTo({ left: saved.scroll[0], top: saved.scroll[1], behavior: 'instant' });
        if (saved.containerScroll) container.scrollTo({ left: saved.containerScroll[0], top: saved.containerScroll[1], behavior: 'instant' });
        restoring = false;
        report();
        publish('restored', { snapshot: snapshot() });
      }));
    }
  });
  syncAction();
  publish('ready');
  report();
})();
