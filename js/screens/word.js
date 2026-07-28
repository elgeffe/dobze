import { h, stateGlyph } from '../ui.js';
import { getState, setWordState } from '../store.js';
import { wordsFor, bridgeOf, formsFor, STATE_ORDER, STATE_LABEL } from '../data.js';
import { go } from '../router.js';
import { renderList } from './list.js';

export function renderWord({ rank }) {
  const r = parseInt(rank, 10);
  const s = getState();
  const dir = s.settings.language;
  const ns = dir;
  const w = wordsFor(dir).find(x => x.rank === r);
  if (!w) { go('/list'); return h('div'); }
  const ws = s.words[`${ns}:${r}`] || { state: 'new' };
  const idx = STATE_ORDER.indexOf(ws.state);

  // Render List below + sheet on top
  const root = renderList();

  const scrim = h('div', { class: 'scrim', onclick: () => go('/list') });

  const sheet = h('div', { class: 'sheet' },
    h('div', { class: 'sheet-handle' }),
    h('div', { class: 'detail-head' },
      h('div', null,
        h('div', { class: 'detail-rank' }, `#${String(w.rank).padStart(3, '0')} · ${w.pos}`),
        h('div', { class: 'detail-lemma' }, w.lemma),
        h('div', { class: 'detail-bridge' }, `${bridgeOf(w, dir)} · ${w.en}`),
      ),
      stateGlyph(ws.state),
    ),
    h('hr', { class: 'hr-rule' }),
    h('div', { class: 'eyebrow', style: { marginBottom: '8px' } }, 'In context'),
    w.base !== w.lemma ? h('div', { class: 'example-quote' }, 'Dictionary form: ', w.base) :
      h('div', { class: 'example-quote' }, 'Frequency: ', w.frequency.toLocaleString(), ' occurrences in the source corpus'),
    formsFor(w, dir)?.length ? h('div', { class: 'word-family' },
      h('div', { class: 'word-family-title' }, 'Polish transformations'),
      h('div', { class: 'forms-row', style: { paddingLeft: '0' } }, ...formsFor(w, dir).map(f =>
        h('span', { class: 'form-chip seen' }, h('span', { class: 'form-text' }, f.form), h('span', { class: 'form-hint' }, f.hint)))),
    ) : null,
    h('div', { class: 'eyebrow', style: { marginTop: '4px', marginBottom: '10px' } }, 'Recognition'),
    h('div', { class: 'state-stepper' },
      ...STATE_ORDER.map((st, i) =>
        h('button', {
          class: i === idx ? 'current' : (i < idx ? 'past' : ''),
          onclick: () => {
            setWordState(dir, w.rank, st);
            // Re-render
            const ev = new HashChangeEvent('hashchange');
            window.dispatchEvent(ev);
          }
        }, STATE_LABEL[st])
      )
    ),
  );

  // Append scrim + sheet on top
  // Slight defer so they animate in over the list
  requestAnimationFrame(() => {
    document.body.append(scrim);
    document.body.append(sheet);
  });

  // Hook to remove scrim/sheet when route changes
  const cleanup = () => {
    scrim.remove();
    sheet.remove();
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);

  return root;
}
