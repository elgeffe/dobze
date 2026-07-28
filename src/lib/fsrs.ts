import type { Card, WordProgress } from './types';

const W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316,
  1.0651, 0.0234, 1.616, 0.1544, 1.0824, 1.9813,
  0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
] as const;
const REQUEST_RETENTION = 0.9;
const FACTOR = 19 / 81;
const DECAY = -0.5;
const ONE_DAY = 86_400_000;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function newCard(): Card {
  return { s: 0, d: 0, reps: 0, lapses: 0, lastReviewAt: 0, dueAt: 0 };
}

function initialDifficulty(rating: number) {
  return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10);
}

function initialStability(rating: number) {
  return Math.max(0.1, W[rating - 1] ?? W[0]);
}

function nextDifficulty(difficulty: number, rating: number) {
  const delta = difficulty - W[6] * (rating - 3);
  return clamp(W[7] * (initialDifficulty(4) - delta) + delta, 1, 10);
}

function retrievability(stability: number, elapsedDays: number) {
  if (stability <= 0) return 0;
  return Math.pow(1 + FACTOR * elapsedDays / stability, DECAY);
}

function nextRecallStability(difficulty: number, stability: number, retrievabilityValue: number, rating: number) {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  return stability * (1 + Math.exp(W[8]) * (11 - difficulty) *
    Math.pow(stability, -W[9]) *
    (Math.exp((1 - retrievabilityValue) * W[10]) - 1) *
    hardPenalty * easyBonus);
}

function nextForgetStability(difficulty: number, stability: number, retrievabilityValue: number) {
  return W[11] * Math.pow(difficulty, -W[12]) *
    (Math.pow(stability + 1, W[13]) - 1) *
    Math.exp((1 - retrievabilityValue) * W[14]);
}

function intervalFromStability(stability: number) {
  const interval = (stability / FACTOR) *
    (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.round(interval));
}

export function review(card: Card, rating: 1 | 2 | 3 | 4, now = Date.now()): Card {
  const next = { ...card };
  if (card.reps === 0) {
    next.d = initialDifficulty(rating);
    next.s = initialStability(rating);
  } else {
    const elapsed = Math.max(0, now - (card.lastReviewAt || now)) / ONE_DAY;
    const recall = retrievability(card.s, elapsed);
    next.d = nextDifficulty(card.d, rating);
    if (rating === 1) {
      next.s = nextForgetStability(card.d, card.s, recall);
      next.lapses = card.lapses + 1;
    } else {
      next.s = nextRecallStability(card.d, card.s, recall, rating);
    }
  }
  next.reps = card.reps + 1;
  next.lastReviewAt = now;
  next.dueAt = rating === 1
    ? now + 10 * 60 * 1000
    : now + intervalFromStability(next.s) * ONE_DAY;
  return next;
}

export function nextDueHint(card: Card, rating: 1 | 2 | 3 | 4, now = Date.now()) {
  const delta = review(card, rating, now).dueAt - now;
  if (delta < 60_000) return '<1m';
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m`;
  if (delta < ONE_DAY) return `${Math.round(delta / 3_600_000)}h`;
  if (delta < 30 * ONE_DAY) return `${Math.round(delta / ONE_DAY)}d`;
  return `${Math.round(delta / (30 * ONE_DAY))}mo`;
}

export function dueCards(words: Record<string, WordProgress>, now = Date.now()) {
  return Object.entries(words)
    .filter(([, word]) =>
      word?.fsrs &&
      Number.isFinite(word.fsrs.dueAt) &&
      word.fsrs.dueAt <= now &&
      word.state !== 'new')
    .sort(([, a], [, b]) => a.fsrs.dueAt - b.fsrs.dueAt)
    .map(([key]) => key);
}
