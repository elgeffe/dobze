import { describe, expect, it } from 'vitest';
import { dueCards, newCard, review } from './fsrs';

describe('FSRS scheduler', () => {
  it('creates a fresh immutable card', () => {
    expect(newCard()).toEqual({ s: 0, d: 0, reps: 0, lapses: 0, lastReviewAt: 0, dueAt: 0 });
  });

  it('schedules Again for ten minutes without mutating its input', () => {
    const card = newCard();
    const next = review(card, 1, 1_000_000);
    expect(next.dueAt).toBe(1_600_000);
    expect(next.lapses).toBe(0);
    expect(card).toEqual(newCard());
  });

  it.each([2, 3, 4] as const)('schedules successful rating %s at least one day out', (rating) => {
    const now = 1_000_000;
    expect(review(newCard(), rating, now).dueAt).toBeGreaterThanOrEqual(now + 86_400_000);
  });

  it('returns due learning cards oldest first and excludes new cards', () => {
    const card = (dueAt: number) => ({ ...newCard(), dueAt });
    expect(dueCards({
      'pl:1': { state: 'known', fsrs: card(20) },
      'pl:2': { state: 'heard', fsrs: card(10) },
      'pl:3': { state: 'new', fsrs: card(0) },
      'pl:4': { state: 'recognized', fsrs: card(1000) },
    }, 100)).toEqual(['pl:2', 'pl:1']);
  });
});
