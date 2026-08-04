import { describe, expect, it } from 'vitest';
import { contentFor, wordsFor } from '../lib/data';
import { LANGUAGES, type Language } from '../lib/types';

// The corpora are 2.6 MB of generated JSON reached through a glob, so the
// compiler cannot see their shape. These checks are the type boundary: they
// run in CI against the checked-in data rather than costing every user a
// validation pass at startup.

const EXPECTED_ENTRIES = 1000;

describe.each(LANGUAGES)('%s frequency corpus', (language: Language) => {
  const words = wordsFor(language);

  it('ships exactly the top 1,000 tokens, ranked contiguously', () => {
    expect(words).toHaveLength(EXPECTED_ENTRIES);
    expect(words.map((word) => word.rank)).toEqual(
      Array.from({ length: EXPECTED_ENTRIES }, (_, index) => index + 1),
    );
  });

  it('gives every entry the fields the app reads', () => {
    for (const word of words) {
      expect(typeof word.lemma, `#${word.rank} lemma`).toBe('string');
      expect(word.lemma.length, `#${word.rank} lemma is empty`).toBeGreaterThan(0);
      expect(typeof word.base, `#${word.rank} base`).toBe('string');
      expect(typeof word.pos, `#${word.rank} pos`).toBe('string');
      expect(typeof word.en, `#${word.rank} en`).toBe('string');
      expect(word.en.length, `#${word.rank} (${word.lemma}) has no gloss`).toBeGreaterThan(0);
      expect(Number.isFinite(word.frequency), `#${word.rank} frequency`).toBe(true);
    }
  });

  it('orders entries by descending frequency', () => {
    const frequencies = words.map((word) => word.frequency);
    expect([...frequencies].sort((a, b) => b - a)).toEqual(frequencies);
  });

  it('lists no duplicate lemmas', () => {
    const seen = new Set(words.map((word) => word.lemma.toLowerCase()));
    expect(seen.size).toBe(words.length);
  });

  it('gives Polish entries inflected forms and other languages none', () => {
    for (const word of words) {
      if (language !== 'pl') {
        expect(word.forms ?? [], `#${word.rank} unexpected forms`).toHaveLength(0);
        continue;
      }
      for (const form of word.forms ?? []) {
        expect(typeof form.form, `#${word.rank} form`).toBe('string');
        expect(typeof form.hint, `#${word.rank} hint`).toBe('string');
      }
    }
  });
});

describe.each(LANGUAGES)('%s learning content', (language: Language) => {
  const content = contentFor(language);
  const words = wordsFor(language);

  it('covers every ranked word exactly once', () => {
    expect(Object.keys(content)).toHaveLength(EXPECTED_ENTRIES);
    for (const word of words) {
      expect(content[String(word.rank)], `#${word.rank} (${word.lemma}) missing`).toBeDefined();
    }
  });

  it('describes the word the frequency list ranks at that position', () => {
    // Content is keyed by rank, and ranks move whenever the lists are rebuilt.
    // Without this, regenerating one file and not the other leaves every entry
    // present and correct-looking while describing the wrong word.
    for (const word of words) {
      expect(content[String(word.rank)]?.lemma, `#${word.rank}`).toBe(word.lemma);
    }
  });

  it('carries an English meaning and a non-empty example for every entry', () => {
    for (const word of words) {
      const entry = content[String(word.rank)];
      expect(typeof entry.meaning?.en, `#${word.rank} (${word.lemma}) meaning`).toBe('string');
      expect(entry.meaning?.en?.length, `#${word.rank} (${word.lemma}) meaning is empty`)
        .toBeGreaterThan(0);
      const context = entry.contexts?.en;
      expect(context?.example?.length, `#${word.rank} (${word.lemma}) example is empty`)
        .toBeGreaterThan(0);
    }
  });

  it('tags every context with a known source', () => {
    for (const entry of Object.values(content)) {
      const source = entry.contexts?.en?.source;
      if (source !== undefined) expect(['tatoeba', 'curated']).toContain(source);
    }
  });
});
