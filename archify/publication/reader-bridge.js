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
    .publication-explore { display: block; padding: 0.7rem 0.75rem; border-bottom: 1px solid var(--toolbar-border);
      color: var(--frontend-stroke); background: var(--frontend-fill); font: inherit; font-weight: 600;
      text-decoration: underline; text-underline-offset: 0.2em; overflow-wrap: anywhere; }
    .publication-explore[hidden] { display: none; }
    .publication-explore:hover { background: var(--toolbar-hover); }
    .publication-explore:focus-visible { outline: 2px solid currentColor; outline-offset: -3px; }
  `;
  document.head.appendChild(style);
  const explore = document.createElement('a');
  explore.className = 'publication-explore';
  explore.id = 'publication-explore';
  explore.hidden = true;
  chip.querySelector('.relationship-lens-head').after(explore);
  let activeLink = null;
  function navigate(link) {
    publish('navigate', { component: link.component, target: link.target, snapshot: snapshot() });
  }
  explore.addEventListener('click', event => {
    event.preventDefault();
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
      explore.href = config.readingLink.split('#')[0] + `#diagram=${encodeURIComponent(activeLink.target)}`;
      Archify.focus.reposition();
    } else explore.removeAttribute('href');
  }
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
