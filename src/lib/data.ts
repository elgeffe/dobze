import { PL_WORDS, EN_WORDS, NL_WORDS } from '../../js/generated/frequency-data.js';
import { PL_CONTENT } from '../../js/content/pl.js';
import { EN_CONTENT } from '../../js/content/en.js';
import { NL_CONTENT } from '../../js/content/nl.js';
import type { Language, LearningContext, Word, WordForm, WordState } from './types';

export const STATE_ORDER: WordState[] = ['new', 'heard', 'recognized', 'known'];
export const STATE_LABEL: Record<WordState, string> = {
  new: 'New',
  heard: 'Learning',
  recognized: 'Recognized',
  known: 'Known',
};

const CORPORA: Record<Language, Word[]> = {
  pl: PL_WORDS as Word[],
  en: EN_WORDS as Word[],
  nl: NL_WORDS as Word[],
};

type ContentEntry = {
  meaning?: Partial<Record<Language, string>>;
  example?: string;
  exampleTranslation?: Partial<Record<Language, string>>;
  note?: Partial<Record<Language, string>>;
};
const CONTENT = {
  pl: PL_CONTENT,
  en: EN_CONTENT,
  nl: NL_CONTENT,
} as Record<Language, Record<number, ContentEntry>>;

export function languageFor(value: unknown): Language {
  const candidate = typeof value === 'string'
    ? value
    : (value as { language?: string } | null)?.language;
  if (candidate === 'nl-from-pl') return 'nl';
  if (candidate === 'pl-from-nl') return 'pl';
  return candidate === 'pl' || candidate === 'en' || candidate === 'nl' ? candidate : 'pl';
}

export const wordsFor = (language: unknown) => CORPORA[languageFor(language)];

export function bridgeOf(word: Word, language: unknown, homeLanguage: Language = 'en') {
  return CONTENT[languageFor(language)]?.[word.rank]?.meaning?.[homeLanguage] ?? word.en;
}

export function contextFor(word: Word, language: unknown, homeLanguage: Language = 'en'): LearningContext {
  const content = CONTENT[languageFor(language)]?.[word.rank];
  return {
    example: content?.example ?? word.lemma,
    translation: content?.exampleTranslation?.[homeLanguage] ?? null,
    note: content?.note?.[homeLanguage] ?? null,
    curated: Boolean(content),
  };
}

export function formsFor(word: Word, language: unknown): WordForm[] | null {
  return languageFor(language) === 'pl' ? word.forms ?? [] : null;
}

export function languageName(code: unknown) {
  return { pl: 'Polski · Polish', en: 'English', nl: 'Nederlands · Dutch' }[languageFor(code)];
}

export function shortLanguageName(code: unknown) {
  return { pl: 'Polish', en: 'English', nl: 'Dutch' }[languageFor(code)];
}
