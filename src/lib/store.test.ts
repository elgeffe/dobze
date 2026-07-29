import { describe, expect, it } from 'vitest';
import { createAppStore, STORAGE_KEY } from './store';

function memoryStorage(seed?: string) {
  let value = seed ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => { value = next; },
    read: () => value,
  };
}

describe('app store', () => {
  it('creates all 8,000 language cards and persists updates', () => {
    const storage = memoryStorage();
    const store = createAppStore(storage);
    expect(Object.keys(store.snapshot().words)).toHaveLength(8000);
    store.setLanguage('nl');
    expect(JSON.parse(storage.read()!).settings.language).toBe('nl');
    expect(STORAGE_KEY).toBe('dobze.v1');
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
