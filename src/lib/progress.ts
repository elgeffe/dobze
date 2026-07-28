import type { AppState, Language, Word, WordState } from './types';

export type StateCounts = Record<WordState, number>;

export function stateCounts(state: AppState, language: Language, words: Word[]): StateCounts {
  const counts: StateCounts = { known: 0, recognized: 0, heard: 0, new: 0 };
  for (const word of words) {
    counts[state.words[`${language}:${word.rank}`]?.state ?? 'new'] += 1;
  }
  return counts;
}

export function recognizedPercent(counts: StateCounts, total: number) {
  return total ? Math.round(((counts.known + counts.recognized) / total) * 100) : 0;
}
