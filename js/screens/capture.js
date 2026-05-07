import { h, tabBar } from '../ui.js';
import { getState, tapInSession, endSession } from '../store.js';
import { wordsFor } from '../data.js';
import { go } from '../router.js';

export function renderCapture() {
  const s = getState();
  const dir = s.settings.dir;
  const ns = dir === 'nl-from-pl' ? 'nl' : 'pl';
  const list = wordsFor(dir);
  const session = s.capture.activeSession;
  const taps = session?.taps || [];

  // Surface 14 nearby ranks: a mix of high-frequency + a few being-learned
  const surfaced = [
    ...list.filter(w => w.rank <= 6),
    ...list.filter(w => w.rank > 6 && w.rank <= 30 && (s.words[`${ns}:${w.rank}`]?.state === 'heard' || s.words[`${ns}:${w.rank}`]?.state === 'new')).slice(0, 6),
    ...list.filter(w => w.rank > 30 && w.rank <= 60).slice(0, 4),
  ].slice(0, 14);

  const screen = h('main', { class: 'screen' });

  // Header
  screen.append(
    h('div', { class: 'capture-head' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('div', null,
          h('div', { class: 'capture-eyebrow' },
            h('span', { class: 'pulse' }),
            session ? 'Capturing' : 'Idle',
          ),
          h('div', { class: 'capture-title' }, session?.name || 'Tap to start a session'),
        ),
        h('div', { class: 'taps-counter' },
          String(taps.length),
          h('span', { class: 'label' }, 'TAPS'),
        ),
      ),
    ),
  );

  // Just-heard pill row
  if (taps.length > 0) {
    const recent = [...taps].slice(-8).reverse();
    screen.append(
      h('div', { class: 'justheard' },
        h('div', { class: 'label' }, 'Just heard'),
        ...recent.map(t => {
          const w = list.find(x => x.rank === t.rank);
          return w ? h('div', { class: 'pill' }, w.lemma) : null;
        })
      )
    );
  }

  // Cell grid
  const grid = h('div', { class: 'capture-grid' });
  const flashRanks = new Set(taps.slice(-6).map(t => t.rank));
  for (const w of surfaced) {
    const tapped = flashRanks.has(w.rank);
    const ws = s.words[`${ns}:${w.rank}`] || { state: 'new' };
    const cell = h('button', {
      class: 'capture-cell' + (tapped ? ' tapped' : ''),
      onclick: () => {
        tapInSession(dir, w.rank);
        const ev = new HashChangeEvent('hashchange');
        window.dispatchEvent(ev);
      }
    },
      h('div', { class: 'cell-head' },
        h('div', { class: 'cell-rank' }, `#${String(w.rank).padStart(3, '0')}`),
        h('span', { class: `state-dot s-${ws.state}`, style: { width: '11px', height: '11px' } }, h('i')),
      ),
      h('div', null,
        h('div', { class: 'cell-lemma' }, w.lemma),
        h('div', { class: 'cell-bridge' }, dir === 'pl-from-nl' ? w.nl : w.pl),
      ),
      tapped ? h('div', { class: 'cell-plus' }, '+1') : null,
    );
    grid.append(cell);
  }
  screen.append(grid);

  // Session bar
  if (session) {
    screen.append(
      h('button', { class: 'session-bar', onclick: () => { endSession(); go('/hub'); } },
        h('span', null, 'End session & save'),
        h('span', { style: { fontFamily: 'var(--serif)', fontSize: '18px', color: 'var(--ink)' } }, '→'),
      )
    );
  } else if (taps.length === 0) {
    // First-launch hint
    screen.append(
      h('div', { class: 'empty-state' },
        h('p', null, 'Tap any word above to start a Sunday session — or whatever you\'re doing.'),
      )
    );
  }

  screen.append(tabBar('capture'));
  return screen;
}
