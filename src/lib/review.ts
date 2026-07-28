import { dueCards, review } from './fsrs';
import type { AppState, Language, WordProgress } from './types';

export function buildReviewQueue(state: AppState, language: Language, limit = 20) {
  const prefix = `${language}:`;
  const due = dueCards(state.words).filter((key) => key.startsWith(prefix));
  const unseen = Object.entries(state.words)
    .filter(([key, word]) => key.startsWith(prefix) && word.state === 'new')
    .sort(([a], [b]) => Number(a.split(':')[1]) - Number(b.split(':')[1]))
    .map(([key]) => key);
  return [...new Set([...due, ...unseen])].slice(0, limit);
}

export function rateWord(progress: WordProgress, rating: 1 | 2 | 3 | 4, now = Date.now()): WordProgress {
  const next = structuredClone(progress);
  next.fsrs = review(next.fsrs, rating, now);
  if (rating === 1) next.state = next.state === 'known' ? 'recognized' : 'heard';
  else if (rating === 2 && next.state === 'new') next.state = 'heard';
  else if (rating === 3) next.state = next.state === 'known' ? 'known' : 'recognized';
  else if (rating === 4) next.state = 'known';
  return next;
}
