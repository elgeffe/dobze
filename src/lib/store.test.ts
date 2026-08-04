import { describe, expect, it } from 'vitest';
import { newCard } from './fsrs';
import { createAppStore, progressFor, STORAGE_KEY } from './store';

const VALID_CARD = JSON.stringify({ state: 'known', fsrs: { ...newCard(), reps: 1, lastReviewAt: 1 } });

function memoryStorage(seed?: string) {
  let value = seed ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => { value = next; },
    read: () => value,
  };
}

describe('app store', () => {
  it('stores no cards until a word is rated, and persists updates', () => {
    const storage = memoryStorage();
    const store = createAppStore(storage);
    expect(Object.keys(store.snapshot().words)).toHaveLength(0);
    store.setLanguage('nl');
    expect(JSON.parse(storage.read()!).settings.language).toBe('nl');
    expect(STORAGE_KEY).toBe('dobze.v1');

    store.setWordState('nl', 12, 'known');
    expect(Object.keys(store.snapshot().words)).toEqual(['nl:12']);
    expect(JSON.parse(storage.read()!).words['nl:12'].state).toBe('known');
  });

  it('treats an unrated word as a blank new card', () => {
    const store = createAppStore();
    const progress = progressFor(store.snapshot(), 'pl:1');
    expect(progress.state).toBe('new');
    expect(progress.fsrs.reps).toBe(0);
  });

  it('drops the blank cards older versions wrote, keeping real progress', () => {
    const legacy = { settings: {}, words: {} as Record<string, unknown> };
    for (let rank = 1; rank <= 1000; rank += 1) {
      legacy.words[`pl:${rank}`] = { state: 'new', fsrs: newCard() };
    }
    legacy.words['pl:7'] = { state: 'known', fsrs: { ...newCard(), reps: 3, lastReviewAt: 1 } };

    const store = createAppStore(memoryStorage(JSON.stringify(legacy)));
    expect(Object.keys(store.snapshot().words)).toEqual(['pl:7']);
    expect(store.snapshot().words['pl:7'].state).toBe('known');
  });

  it('rejects progress under keys outside the shipped corpora', () => {
    const store = createAppStore();
    expect(store.importJSON('{"settings":{},"words":{"zz:1":' + VALID_CARD + '}}')).toBe(false);
    expect(store.importJSON('{"settings":{},"words":{"pl:4000":' + VALID_CARD + '}}')).toBe(false);
    expect(store.importJSON('{"settings":{},"words":{"pl:1":' + VALID_CARD + '}}')).toBe(true);
  });

  it('recovers from corrupt stored JSON', () => {
    const store = createAppStore(memoryStorage('{oops'));
    expect(store.snapshot().settings.language).toBe('pl');
  });

  it('does not mutate state when an import is structurally invalid', () => {
    const store = createAppStore();
    const before = store.exportJSON();
    expect(store.importJSON('{"settings":{},"words":{"pl:1":{"state":"oops"}}}')).toBe(false);
    expect(store.exportJSON()).toBe(before);
  });
});
