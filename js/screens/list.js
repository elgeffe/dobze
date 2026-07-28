import { h, tabBar, stateDot } from '../ui.js';
import { getState } from '../store.js';
import { wordsFor, formsFor, bridgeOf } from '../data.js';
import { go } from '../router.js';

let activeFilter = 'all';

export function renderList() {
  const s = getState();
  const dir = s.settings.language;
  const ns = dir;
  const all = wordsFor(dir);
  const filtered = activeFilter === 'all' ? all : all.filter(w => (s.words[`${ns}:${w.rank}`]?.state || 'new') === activeFilter);

  const tiers = [
    { name: 'Core 100',  min: 1,   max: 100,  rank: '01–100' },
    { name: 'Backbone',  min: 101, max: 500,  rank: '100–500' },
    { name: 'Long tail', min: 501, max: 1000, rank: '500–1000' },
  ];
  for (const t of tiers) {
    const sliceAll = all.filter(w => w.rank >= t.min && w.rank <= t.max);
    const denomTotal = t.max - t.min + 1;
    const known = sliceAll.filter(w => {
      const ws = s.words[`${ns}:${w.rank}`];
      return ws && (ws.state === 'known' || ws.state === 'recognized');
    }).length;
    t.pct = Math.round((known / denomTotal) * 100);
    t.count = `${known} / ${denomTotal}`;
    t.words = filtered.filter(w => w.rank >= t.min && w.rank <= t.max);
  }

  const screen = h('main', { class: 'screen' },
    h('div', { class: 'masthead' },
      h('div', { class: 'eyebrow' }, 'Browse'),
      h('div', { class: 'masthead-title', style: { marginTop: '4px' } }, 'By tier'),
      h('div', { class: 'masthead-sub' }, 'Earlier tiers cover more conversation.'),
    ),
    h('div', { class: 'filters', style: { marginTop: '14px' } },
      ...['all','new','heard','recognized','known'].map(k =>
        h('button', {
          class: 'chip' + (activeFilter === k ? ' active' : ''),
          onclick: () => { activeFilter = k; rerender(); },
        }, k.charAt(0).toUpperCase() + k.slice(1))
      )
    ),
  );

  for (const t of tiers) {
    if (t.words.length === 0 && activeFilter !== 'all') continue;
    screen.append(tierHeader(t));
    if (t.words.length === 0) {
      screen.append(h('div', { class: 'empty-state' },
        h('h3', null, 'No words match this filter in this tier.'),
      ));
    } else {
      screen.append(tierGroup(t.words, dir, ns, s));
    }
  }

  if (activeFilter !== 'all' && tiers.every(t => t.words.length === 0)) {
    screen.append(h('div', { class: 'empty-state' },
      h('div', { class: 'glyph' }),
      h('h3', null, `No ${activeFilter} words yet.`),
      h('p', null, 'Try a different filter, or start a review to build your progress.'),
    ));
  }

  screen.append(h('div', { style: { height: '110px' } }));
  screen.append(tabBar('list'));
  return screen;
}

function tierHeader(t) {
  return h('div', { class: 'tier-header' },
    h('div', { class: 'tier-inkwell' },
      h('span', { class: 'inkwell-fill', style: { height: t.pct + '%' } }),
      h('div', { class: 'pct-label' }, t.pct + '%'),
    ),
    h('div', { class: 'tier-meta' },
      h('div', { class: 'tier-rank' }, 'RANK ' + t.rank),
      h('div', { class: 'tier-title' }, t.name),
      h('div', { class: 'tier-count' }, `${t.count} known or recognised`),
    ),
  );
}

function tierGroup(words, dir, ns, s) {
  return h('div', { class: 'tier-group' },
    ...words.map(w => listRow(w, dir, ns, s))
  );
}

function listRow(w, dir, ns, s) {
  const ws = s.words[`${ns}:${w.rank}`] || { state: 'new', formsHeard: 0 };
  const forms = formsFor(w, dir);

  const row = h('button', {
    class: 'list-row',
    onclick: () => go('/word/' + w.rank),
  },
    h('div', { class: 'list-row-main' },
      stateDot(ws.state),
      h('div', { class: 'list-rank' }, String(w.rank).padStart(3, '0')),
      h('div', { class: 'list-body' },
        h('div', { class: 'list-lemma' }, w.lemma),
        h('div', { class: 'list-bridge' }, bridgeOf(w, dir, s.settings.homeLanguage)),
      ),
      h('div', { class: 'list-pos' }, w.pos),
    ),
    forms ? h('div', { class: 'forms-row' },
      ...forms.map((f, i) => {
        return h('span', { class: 'form-chip seen' },
          h('span', { class: 'form-text' }, f.form),
          h('span', { class: 'form-hint' }, f.hint),
        );
      })
    ) : null,
  );
  return row;
}

function rerender() {
  // Trigger router redraw by toggling hash same path
  const ev = new HashChangeEvent('hashchange');
  window.dispatchEvent(ev);
}
