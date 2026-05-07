// Tiny DOM helpers. No framework, no innerHTML for user-derived strings.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'data' && typeof v === 'object') for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

export function stateDot(state) {
  return h('span', { class: `state-dot s-${state}` }, h('i'));
}
export function stateGlyph(state) {
  return h('div', { class: `state-glyph s-${state}` }, h('i'));
}

export function tabBar(active) {
  const tabs = [
    { id: 'hub',     label: 'Hub',     href: '#/hub' },
    { id: 'list',    label: 'List',    href: '#/list' },
    { id: 'capture', label: 'Capture', href: '#/capture' },
    { id: 'review',  label: 'Review',  href: '#/review' },
  ];
  return h('nav', { class: 'tabbar' }, tabs.map(t =>
    h('a', { href: t.href, class: t.id === active ? 'active' : '' }, t.label)
  ));
}

export function statusInk() {
  // We let iOS draw the real status bar; this just reserves space via screen padding.
  return null;
}

export function masthead({ left, right, title, sub }) {
  return h('div', { class: 'masthead' },
    (left || right) && h('div', { class: 'masthead-row' },
      left ? h('div', { class: 'serif italic', style: { fontSize: '14px', color: 'var(--ink3)' } }, left) : h('span'),
      right ? h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--ink3)', letterSpacing: '0.5px' } }, right) : h('span'),
    ),
    h('div', { class: 'masthead-rule' }),
    title && h('div', { class: 'masthead-title' }, title),
    sub && h('div', { class: 'masthead-sub' }, sub),
  );
}

let toastTimer = null;
export function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 1600);
}

export function dateLabel(d = new Date()) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`;
}
