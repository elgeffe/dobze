import { describe, expect, it } from 'vitest';
import { createDefaultState } from './store';
import { buildReviewQueue, rateWord } from './review';
import { newCard } from './fsrs';

describe('review sessions', () => {
  it('prioritizes due cards, fills by frequency and caps the queue', () => {
    const state = createDefaultState();
    state.words['pl:50'] = { state: 'heard', fsrs: { ...newCard(), dueAt: 0 } };
    const queue = buildReviewQueue(state, 'pl');
    expect(queue).toHaveLength(20);
    expect(queue[0]).toBe('pl:50');
    expect(queue[1]).toBe('pl:1');
  });

  it('keeps difficult cards in learning and promotes easy cards', () => {
    const fresh = { state: 'new' as const, fsrs: newCard() };
    expect(rateWord(fresh, 1, 100).state).toBe('heard');
    expect(rateWord(fresh, 4, 100).state).toBe('known');
    expect(fresh.state).toBe('new');
  });
});
