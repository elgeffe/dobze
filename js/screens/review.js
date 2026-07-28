import { h, tabBar, stateGlyph } from '../ui.js';
import { getState, update } from '../store.js';
import { wordsFor, bridgeOf, contextFor } from '../data.js';
import { review as fsrsReview, nextDueHint, dueCards } from '../fsrs.js';

let queue = null; // array of word keys built once per session
let queueIdx = 0;
let revealed = false;

export function renderReview() {
  const s = getState();
  const dir = s.settings.language;
  const ns = dir;

  if (!queue) buildQueue(s, ns);

  if (queueIdx >= queue.length) {
    // Empty / done
    return renderEmptyOrDone(queue.length === 0 ? 'empty' : 'done');
  }

  const key = queue[queueIdx];
  const rank = parseInt(key.split(':')[1], 10);
  const w = wordsFor(dir).find(x => x.rank === rank);
  if (!w) { queueIdx++; return renderReview(); }
  const ws = s.words[key];
  const context = contextFor(w, dir, s.settings.homeLanguage);

  const screen = h('main', { class: 'screen no-tabs' });

  screen.append(
    h('div', { class: 'review-head' },
      h('div', { class: 'serif italic', style: { fontSize: '13px', color: 'var(--ink3)' } }, `Review · ${queueIdx + 1} of ${queue.length}`),
      h('a', { href: '#/hub', class: 'mono', style: { fontSize: '10px', color: 'var(--ink3)' } }, 'ESC'),
    ),
    h('div', { style: { height: '1px', background: 'var(--ink)', margin: '8px 24px 0' } }),
    h('div', { class: 'review-progress' },
      ...queue.map((_, i) => h('i', { class: i <= queueIdx ? 'done' : '' }))
    ),
  );

  // Card
  if (!revealed) {
    screen.append(
      h('div', { class: 'card-stack' },
        h('button', {
          class: 'review-card front',
          onclick: () => { revealed = true; rerender(); }
        },
          h('div', { class: 'review-card-meta' },
            h('div', { class: 'review-card-mono' }, `#${String(w.rank).padStart(3, '0')} · ${w.pos}`),
            stateGlyph(ws.state),
          ),
          h('div', { class: 'review-card-front-body' },
            h('div', { class: 'lemma' }, w.lemma),
            h('div', { class: 'serif italic', style: { fontSize: '14px', color: 'var(--ink3)' } }, 'tap to reveal'),
          ),
          h('div', { class: 'review-tap-hint' }, 'Show answer'),
        ),
      )
    );
  } else {
    screen.append(
      h('div', { class: 'card-stack' },
        h('div', { class: 'review-card' },
          h('div', { class: 'review-card-meta' },
            h('div', { class: 'review-card-mono' }, `#${String(w.rank).padStart(3, '0')} · ${w.pos}`),
            stateGlyph(ws.state),
          ),
          h('div', { class: 'review-card-back-body' },
            h('div', { class: 'lemma' }, w.lemma),
            h('div', { class: 'bridge' }, bridgeOf(w, dir, s.settings.homeLanguage)),
          ),
          h('div', { class: 'review-context' },
            h('div', { class: 'example-quote' }, context.example),
            context.translation ? h('div', { class: 'context-translation' }, context.translation) : null,
            context.note ? h('div', { class: 'context-note' }, context.note) : null,
          ),
          w.base !== w.lemma ? h('div', { class: 'word-family' },
            h('div', { class: 'word-family-title' }, 'Dictionary form'),
            h('div', null, w.base),
          ) : null,
        ),
      ),
      h('div', { class: 'rating-row' },
        ratingButton(1, 'Again', nextDueHint(ws.fsrs, 1)),
        ratingButton(2, 'Hard', nextDueHint(ws.fsrs, 2)),
        ratingButton(3, 'Good', nextDueHint(ws.fsrs, 3), 'good'),
        ratingButton(4, 'Easy', nextDueHint(ws.fsrs, 4)),
      ),
    );
  }

  return screen;
}

function ratingButton(rating, label, sub, klass) {
  return h('button', {
    class: 'rate-btn ' + (klass || ''),
    onclick: () => {
      const s = getState();
      const key = queue[queueIdx];
      update((st) => {
        const w = st.words[key];
        if (!w) return;
        w.fsrs = fsrsReview(w.fsrs, rating);
        if (rating === 1) w.state = w.state === 'known' ? 'recognized' : 'heard';
        else if (rating === 2 && w.state === 'new') w.state = 'heard';
        else if (rating === 3) w.state = w.state === 'known' ? 'known' : 'recognized';
        else if (rating === 4) w.state = 'known';
      });
      queueIdx++;
      revealed = false;
      rerender();
    }
  },
    h('div', { class: 'label' }, label),
    h('div', { class: 'sub' }, sub),
  );
}

function buildQueue(s, ns) {
  // Take all due cards in this direction
  const due = dueCards(s.words).filter(k => k.startsWith(ns + ':'));
  // Due cards always win. Fill the session with unseen high-frequency words.
  // FSRS gives successful cards progressively longer intervals, so well-known
  // words naturally appear much less often than difficult ones.
  const unseen = Object.entries(s.words)
    .filter(([k, w]) => k.startsWith(ns + ':') && w.state === 'new')
    .sort(([a], [b]) => parseInt(a.split(':')[1]) - parseInt(b.split(':')[1]))
    .map(([k]) => k);
  queue = [...new Set([...due, ...unseen])].slice(0, 20);
  queueIdx = 0;
  revealed = false;
}

function renderEmptyOrDone(kind) {
  queue = null; // reset on next visit
  const screen = h('main', { class: 'screen' });
  screen.append(
    h('div', { class: 'masthead' },
      h('div', { class: 'eyebrow' }, 'Review'),
      h('div', { class: 'masthead-title', style: { marginTop: '4px' } }, kind === 'done' ? 'All done.' : 'Nothing due.'),
      h('div', { class: 'masthead-sub' }, kind === 'done'
        ? 'Cards will reappear when their interval ends.'
        : 'You have reviewed all 1,000 words. Come back when the next card is due.'),
    ),
    h('div', { class: 'screen-pad', style: { paddingTop: '32px' } },
      h('a', { class: 'btn-primary', href: '#/list' }, 'Browse the list'),
    ),
    tabBar('review'),
  );
  return screen;
}

function rerender() {
  const ev = new HashChangeEvent('hashchange');
  window.dispatchEvent(ev);
}

// Reset queue when the user leaves the screen
window.addEventListener('hashchange', () => {
  const path = (location.hash || '').slice(1);
  if (!path.startsWith('/review')) { queue = null; queueIdx = 0; revealed = false; }
});
