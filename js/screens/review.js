import { h, tabBar, stateGlyph } from '../ui.js';
import { getState, getWordKey, update } from '../store.js';
import { wordsFor, bridgeOf } from '../data.js';
import { review as fsrsReview, nextDueHint, dueCards } from '../fsrs.js';
import { go } from '../router.js';

let queue = null; // array of word keys built once per session
let queueIdx = 0;
let revealed = false;

export function renderReview() {
  const s = getState();
  const dir = s.settings.dir;
  const ns = dir === 'nl-from-pl' ? 'nl' : 'pl';

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
            h('div', { class: 'lemma' }, dir === 'pl-from-nl' ? bridgeOf(w, dir) : w.lemma),
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
            h('div', { class: 'lemma' }, dir === 'pl-from-nl' ? w.lemma : bridgeOf(w, dir)),
            h('div', { class: 'bridge' }, `${bridgeOf(w, dir)} · ${w.en}`),
          ),
          h('hr', { class: 'hr-rule' }),
          h('div', { class: 'eyebrow', style: { marginBottom: '6px' } }, 'Example'),
          h('div', { class: 'example-quote' }, '“', w.examples[0], '”'),
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
      const dir = s.settings.dir;
      const key = queue[queueIdx];
      update((st) => {
        const w = st.words[key];
        if (!w) return;
        w.fsrs = fsrsReview(w.fsrs, rating);
        // Promote to known after a successful Good/Easy if recognized
        if (rating >= 3 && (w.state === 'recognized')) w.state = 'known';
        // Demote on Again
        if (rating === 1 && w.state === 'known') w.state = 'recognized';
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
  if (due.length > 0) {
    queue = due.slice(0, 20);
  } else {
    // No FSRS-due cards (fresh install). Seed the queue with the highest-rank
    // recognized/known words so a first-time user can practice immediately.
    queue = Object.entries(s.words)
      .filter(([k, w]) => k.startsWith(ns + ':') && (w.state === 'recognized' || w.state === 'known'))
      .sort(([a], [b]) => parseInt(a.split(':')[1]) - parseInt(b.split(':')[1]))
      .slice(0, 8)
      .map(([k]) => k);
  }
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
        : 'Tap words you hear in Capture, or mark some as Recognized to seed your reviews.'),
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
