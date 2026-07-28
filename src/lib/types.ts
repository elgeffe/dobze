export const LANGUAGES = ['pl', 'en', 'nl'] as const;
export type Language = (typeof LANGUAGES)[number];

export const WORD_STATES = ['new', 'heard', 'recognized', 'known'] as const;
export type WordState = (typeof WORD_STATES)[number];

export interface WordForm {
  form: string;
  hint: string;
}

export interface Word {
  rank: number;
  lemma: string;
  base: string;
  pos: string;
  en: string;
  frequency: number;
  forms?: WordForm[];
}

export interface Card {
  s: number;
  d: number;
  reps: number;
  lapses: number;
  lastReviewAt: number;
  dueAt: number;
}

export interface WordProgress {
  state: WordState;
  fsrs: Card;
}

export interface Settings {
  language: Language;
  homeLanguage: Language;
  onboarded: boolean;
  theme: 'light';
}

export interface AppState {
  settings: Settings;
  words: Record<string, WordProgress>;
}

export interface LearningContext {
  example: string;
  translation: string | null;
  note: string | null;
  curated: boolean;
  source: 'tatoeba' | 'curated' | null;
}
