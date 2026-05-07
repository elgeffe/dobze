import { h } from '../ui.js';
import { tabBar, dateLabel } from '../ui.js';
import { getState } from '../store.js';
import { wordsFor } from '../data.js';
import { dueCards } from '../fsrs.js';

export function renderHub() {
  const s = getState();
  const dir = s.settings.dir;
  const ns = dir === 'nl-from-pl' ? 'nl' : 'pl';
  const list = wordsFor(dir);

  const counts = { known: 0, recognized: 0, heard: 0, new: 0 };
  for (const w of list) {
    const ws = s.words[`${ns}:${w.rank}`];
    counts[ws?.state || 'new']++;
  }
  const total = list.length;
  const recognised = counts.known + counts.recognized;
  const totalSeen = counts.known + counts.recognized + counts.heard;
  const pct = Math.round((recognised / total) * 100);

  // Project to a 1000-corpus feel
  const project = (n) => Math.round(n * 10);
  const projKnown = project(counts.known);
  const projRec   = project(counts.recognized);
  const projHeard = project(counts.heard);
  const projNew   =1000 - projKnown - projRec - projHeard;

  const due = dueCards(s.words).filter(k => k.startsWith(ns + ':')).length;

  const learningName = dir === 'pl-from-nl' ? 'Polski · Polish' : 'Nederlands · Dutch';
  const screen = h('main', { class: 'screen' });

  // Masthead
  screen.append(
    h('div', { class: 'masthead' },
      h('div', { class: 'masthead-row' },
        h('div', { class: 'serif italic', style: { fontSize: '14px', color: 'var(--ink3)' } }, dateLabel()),
        h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--ink3)', letterSpacing: '0.5px' } }, 'VOL · I'),
      ),
      h('div', { class: 'masthead-rule' }),
      h('div', { class: 'masthead-title' }, 'Dobze.'),
      h('div', { class: 'masthead-sub' }, 'Learning ' + learningName),
    )
  );

  // Coverage card
  screen.append(coverageCard({ pct, recognised: projKnown + projRec, total: 1000, counts: { known: projKnown, recognized: projRec, heard: projHeard, new: projNew } }));

  // Today section
  screen.append(
    h('div', { class: 'section' },
      sectionHead('Today', `${totalSeen} of ${total} encountered`),
    ),
    h('div', { class: 'tiles-2' },
      h('a', { class: 'tile accent', href: '#/review' },
        h('div', { class: 'eyebrow' }, 'Practice'),
        h('div', { class: 'tile-title' }, 'Review'),
        h('div', { class: 'tile-foot' },
          h('div', { class: 'tile-big' }, String(due)),
          h('div', { class: 'tile-sub' }, due === 1 ? 'card due' : 'cards due'),
        ),
      ),
      h('a', { class: 'tile', href: '#/coverage' },
        h('div', { class: 'eyebrow' }, 'Progress'),
        h('div', { class: 'tile-title' }, 'Coverage'),
        h('div', { class: 'tile-foot' },
          h('div', { class: 'tile-big' }, String(pct)),
          h('div', { class: 'tile-sub' }, '%'),
        ),
      ),
    ),

    h('div', { class: 'section' }, sectionHead('Read', null)),
    h('div', { style: { margin: '0 16px 110px', display: 'flex', flexDirection: 'column', gap: '8px' } },
      h('a', { class: 'row-tile', href: '#/list' },
        h('div', { class: 'row-tile-glyph' }, miniList()),
        h('div', { class: 'row-tile-body' },
          h('div', { class: 'row-tile-title' }, 'Frequency list'),
          h('div', { class: 'row-tile-sub' }, 'Browse the top 1,000'),
        ),
        h('div', { class: 'row-tile-arrow' }, '→'),
      ),
      h('a', { class: 'row-tile', href: '#/capture' },
        h('div', { class: 'row-tile-glyph' }, miniWaveform()),
        h('div', { class: 'row-tile-body' },
          h('div', { class: 'row-tile-title' }, 'Conversation Capture'),
          h('div', { class: 'row-tile-sub' }, 'Tap words you hear in real life'),
        ),
        h('div', { class: 'row-tile-arrow' }, '→'),
      ),
      h('a', { class: 'row-tile', href: '#/settings' },
        h('div', { class: 'row-tile-glyph' }, miniGear()),
        h('div', { class: 'row-tile-body' },
          h('div', { class: 'row-tile-title' }, 'Settings'),
          h('div', { class: 'row-tile-sub' }, 'Direction, data, reset'),
        ),
        h('div', { class: 'row-tile-arrow' }, '→'),
      ),
    ),
  );

  screen.append(tabBar('hub'));
  return screen;
}

function coverageCard({ pct, recognised, total, counts }) {
  const card = h('div', { class: 'coverage-card' },
    h('div', { class: 'eyebrow' }, 'Coverage'),
    h('div', { class: 'coverage-row' },
      h('div', { class: 'inkwell' }, h('span', { class: 'inkwell-fill', style: { height: pct + '%' } })),
      h('div', { style: { flex: 1 } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '4px' } },
          h('div', { class: 'coverage-num' }, String(pct)),
          h('div', { class: 'coverage-pct' }, '%'),
          h('div', { class: 'coverage-meta' }, `${recognised} of\ntop ${total.toLocaleString()}`),
        ),
      ),
    ),
    h('div', { class: 'coverage-bar' },
      h('i', { class: 'seg-known', style: { width: `${(counts.known/total)*100}%` } }),
      h('i', { class: 'seg-rec', style: { width: `${(counts.recognized/total)*100}%` } }),
      h('i', { class: 'seg-heard', style: { width: `${(counts.heard/total)*100}%` } }),
    ),
    h('div', { class: 'legend-row' },
      legend('var(--state-known)', counts.known, 'Known'),
      legend('var(--state-recognized)', counts.recognized, 'Recognized'),
      legend('var(--state-heard)', counts.heard, 'Heard'),
      legend('var(--state-new)', counts.new, 'New'),
    ),
  );
  return card;
}

function legend(color, label, sub) {
  return h('div', { class: 'legend' },
    h('div', { class: 'legend-top' },
      h('span', { class: 'legend-dot', style: { background: color } }),
      h('span', null, String(label)),
    ),
    h('div', { class: 'legend-sub' }, sub),
  );
}

function sectionHead(title, right) {
  return h('div', { class: 'section-head' },
    h('div', { class: 'label' }, title),
    right ? h('div', { class: 'serif italic', style: { fontSize: '12px', color: 'var(--ink3)' } }, right) : null,
  );
}

function miniList() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '22'); svg.setAttribute('height', '22'); svg.setAttribute('viewBox', '0 0 22 22');
  for (const [x1,y1,x2,y2] of [[2,6,20,6],[2,11,20,11],[2,16,14,16]]) {
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
    ln.setAttribute('stroke', 'var(--ink2)'); ln.setAttribute('stroke-width', '1.5');
    svg.append(ln);
  }
  return svg;
}
function miniWaveform() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '22'); svg.setAttribute('height', '22'); svg.setAttribute('viewBox', '0 0 22 22');
  const xs = [3,7,11,15,19], ys = [3,6,9,5,2], hs = [6,12,18,10,4];
  for (let i = 0; i < 5; i++) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', xs[i] - 1); r.setAttribute('y', 11 - ys[i]);
    r.setAttribute('width', 2); r.setAttribute('height', hs[i]); r.setAttribute('rx', 1);
    r.setAttribute('fill', 'var(--ink2)');
    svg.append(r);
  }
  return svg;
}
function miniGear() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '22'); svg.setAttribute('height', '22'); svg.setAttribute('viewBox', '0 0 22 22');
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', 11); c.setAttribute('cy', 11); c.setAttribute('r', 4);
  c.setAttribute('stroke', 'var(--ink2)'); c.setAttribute('fill', 'none'); c.setAttribute('stroke-width', '1.5');
  svg.append(c);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const x1 = 11 + Math.cos(a) * 7, y1 = 11 + Math.sin(a) * 7;
    const x2 = 11 + Math.cos(a) * 9.5, y2 = 11 + Math.sin(a) * 9.5;
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
    ln.setAttribute('stroke', 'var(--ink2)'); ln.setAttribute('stroke-width', '1.5'); ln.setAttribute('stroke-linecap', 'round');
    svg.append(ln);
  }
  return svg;
}
