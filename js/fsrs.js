// FSRS-4.5-ish scheduler. Simplified and deterministic.
// Stores per-card: stability (s), difficulty (d), lapses, reps, dueAt (ms), lastReviewAt (ms).
// Ratings: 1=Again, 2=Hard, 3=Good, 4=Easy.
//
// Reference: Open Spaced Repetition / FSRS-4.5. We use the standard 19-weight set
// from the FSRS-4.5 default optimizer. Numbers may not be perfect for any given
// learner but the algorithm shape is correct.

const W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316,
  1.0651, 0.0234, 1.616, 0.1544, 1.0824, 1.9813,
  0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567
];
const REQUEST_RETENTION = 0.9;
const FACTOR = 19 / 81;
const DECAY = -0.5;

function clamp(x, min, max) { return Math.min(max, Math.max(min, x)); }
function days(ms) { return ms / 86400000; }
const ONE_DAY = 86400000;

export function newCard() {
  return { s: 0, d: 0, reps: 0, lapses: 0, lastReviewAt: 0, dueAt: 0 };
}

function initialDifficulty(rating) {
  return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10);
}
function initialStability(rating) {
  return Math.max(0.1, W[rating - 1]);
}

function nextDifficulty(d, rating) {
  const dd = d - W[6] * (rating - 3);
  const meanReversion = W[7] * (initialDifficulty(4) - dd) + dd;
  return clamp(meanReversion, 1, 10);
}

function nextRecallStability(d, s, r, rating) {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) *
    (11 - d) *
    Math.pow(s, -W[9]) *
    (Math.exp((1 - r) * W[10]) - 1) *
    hardPenalty * easyBonus);
}

function nextForgetStability(d, s, r) {
  return W[11] *
    Math.pow(d, -W[12]) *
    (Math.pow(s + 1, W[13]) - 1) *
    Math.exp((1 - r) * W[14]);
}

function intervalFromStability(s) {
  // Days until retrievability decays to REQUEST_RETENTION
  const i = (s / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.round(i));
}

function retrievability(s, elapsedDays) {
  if (s <= 0) return 0;
  return Math.pow(1 + FACTOR * elapsedDays / s, DECAY);
}

export function review(card, rating, now = Date.now()) {
  const next = { ...card };
  if (card.reps === 0) {
    next.d = initialDifficulty(rating);
    next.s = initialStability(rating);
  } else {
    const elapsed = days(Math.max(0, now - (card.lastReviewAt || now)));
    const r = retrievability(card.s, elapsed);
    next.d = nextDifficulty(card.d, rating);
    if (rating === 1) {
      next.s = nextForgetStability(card.d, card.s, r);
      next.lapses = (card.lapses || 0) + 1;
    } else {
      next.s = nextRecallStability(card.d, card.s, r, rating);
    }
  }
  next.reps = (card.reps || 0) + 1;
  next.lastReviewAt = now;
  const ivlDays = rating === 1 ? 0 : intervalFromStability(next.s);
  // If "Again", come back in ~10 minutes; otherwise schedule by interval
  next.dueAt = rating === 1 ? now + 10 * 60 * 1000 : now + ivlDays * ONE_DAY;
  return next;
}

// Human-readable "next due" hint for buttons
export function nextDueHint(card, rating, now = Date.now()) {
  const c = review(card, rating, now);
  const dt = c.dueAt - now;
  if (dt < 60_000) return '<1m';
  if (dt < 3_600_000) return Math.round(dt / 60_000) + 'm';
  if (dt < 86_400_000) return Math.round(dt / 3_600_000) + 'h';
  if (dt < 30 * 86_400_000) return Math.round(dt / 86_400_000) + 'd';
  return Math.round(dt / (30 * 86_400_000)) + 'mo';
}

export function dueCards(words, now = Date.now()) {
  // words: { key: { state, fsrs } }
  return Object.entries(words)
    .filter(([_, w]) => w && w.fsrs && w.fsrs.dueAt <= now && (w.state === 'recognized' || w.state === 'known'))
    .sort((a, b) => (a[1].fsrs.dueAt - b[1].fsrs.dueAt))
    .map(([key]) => key);
}
