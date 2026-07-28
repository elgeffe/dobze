import { h, tabBar, dateLabel } from '../ui.js';
import { getState } from '../store.js';
import { wordsFor } from '../data.js';

export function renderCoverage() {
  const s = getState();
  const dir = s.settings.language;
  const ns = dir;
  const list = wordsFor(dir);

  const counts = { known: 0, recognized: 0, heard: 0, new: 0 };
  for (const w of list) {
    const ws = s.words[`${ns}:${w.rank}`];
    counts[ws?.state || 'new']++;
  }
  const recognised = counts.known + counts.recognized;
  const pct = Math.round((recognised / list.length) * 100);

  // Tier breakdown — slice by rank
  const tiers = [
    { name: 'Top 100',     min: 1,   max: 100 },
    { name: '100 – 500',   min: 101, max: 500 },
    { name: '500 – 1,000', min: 501, max: 1000 },
  ];
  for (const t of tiers) {
    const sliceWords = list.filter(w => w.rank >= t.min && w.rank <= t.max);
    const denom = Math.min(t.max - t.min + 1, sliceWords.length || (t.max - t.min + 1));
    const known = sliceWords.filter(w => {
      const ws = s.words[`${ns}:${w.rank}`];
      return ws && (ws.state === 'known' || ws.state === 'recognized');
    }).length;
    t.pct = denom ? Math.round((known / denom) * 100) : 0;
    t.count = `${known} / ${denom}`;
  }

  const screen = h('main', { class: 'screen' },
    h('div', { class: 'masthead' },
      h('div', { class: 'masthead-row' },
        h('div', { class: 'serif italic', style: { fontSize: '13px', color: 'var(--ink3)' } }, dateLabel()),
        h('a', { href: '#/hub', class: 'mono', style: { fontSize: '10px', color: 'var(--ink3)' } }, 'BACK'),
      ),
      h('div', { class: 'masthead-rule' }),
    ),
    h('div', { class: 'screen-pad', style: { paddingTop: '8px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
        h('div', { style: { width: '104px', height: '104px', borderRadius: '104px',
          border: '2px solid var(--ink)', position: 'relative', overflow: 'hidden', flexShrink: 0, background: 'var(--paper)' } },
          h('span', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: pct + '%', background: 'var(--ink)' } }),
        ),
        h('div', { style: { flex: 1 } },
          h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '4px' } },
            h('div', { style: { fontFamily: 'var(--serif)', fontSize: '76px', lineHeight: '0.85', letterSpacing: '-2.5px' } }, String(pct)),
            h('div', { style: { fontFamily: 'var(--serif)', fontSize: '28px', letterSpacing: '-0.6px', paddingBottom: '6px' } }, '%'),
          ),
          h('div', { style: { fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '13px', color: 'var(--ink2)', marginTop: '4px', lineHeight: 1.3 } },
            'recognised in the\ntop one thousand.'),
        ),
      ),
    ),
    h('div', { class: 'section' },
      h('div', { class: 'eyebrow', style: { marginBottom: '14px' } }, 'By frequency tier'),
      ...tiers.map(t =>
        h('div', { class: 'tier-row' },
          h('div', { class: 'small-inkwell' },
            h('span', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: t.pct + '%', background: 'var(--ink)', display: 'block' } }),
          ),
          h('div', { class: 'tier-row-body' },
            h('div', { class: 'tier-row-head' },
              h('div', { class: 'tier-row-name' }, t.name),
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '6px' } },
                h('div', { class: 'tier-row-pct' }, t.pct + '%'),
                h('div', { class: 'tier-row-count' }, t.count),
              ),
            ),
            h('div', { class: 'tier-bar' }, h('i', { style: { width: t.pct + '%' } })),
          ),
        )
      ),
    ),
    h('div', { style: { margin: '14px 24px 0' } },
      h('div', { class: 'eyebrow', style: { marginBottom: '10px' } }, 'By state'),
      h('div', { class: 'state-strip' },
        h('i', { style: { flex: counts.known, background: 'var(--state-known)' } }),
        h('i', { style: { flex: counts.recognized, background: 'var(--state-recognized)' } }),
        h('i', { style: { flex: counts.heard, background: 'var(--state-heard)', opacity: 0.7 } }),
        h('i', { style: { flex: counts.new, background: 'var(--state-new)', opacity: 0.6 } }),
      ),
      h('div', { class: 'state-strip-row' },
        h('span', null, `K · ${counts.known}`),
        h('span', null, `R · ${counts.recognized}`),
        h('span', null, `H · ${counts.heard}`),
        h('span', null, `N · ${counts.new}`),
      ),
    ),
    tabBar('hub'),
  );

  return screen;
}
