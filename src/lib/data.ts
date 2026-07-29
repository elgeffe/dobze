import { PL_WORDS, EN_WORDS, NL_WORDS, FR_WORDS, DE_WORDS, ES_WORDS, IT_WORDS, SV_WORDS } from '../../js/generated/frequency-data.js';
import { PL_CONTENT } from '../../js/content/pl.js';
import { EN_CONTENT } from '../../js/content/en.js';
import { NL_CONTENT } from '../../js/content/nl.js';
import { FR_CONTENT } from '../../js/content/fr.js';
import { DE_CONTENT } from '../../js/content/de.js';
import { ES_CONTENT } from '../../js/content/es.js';
import { IT_CONTENT } from '../../js/content/it.js';
import { SV_CONTENT } from '../../js/content/sv.js';
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
  fr: FR_WORDS as Word[], de: DE_WORDS as Word[], es: ES_WORDS as Word[],
  it: IT_WORDS as Word[], sv: SV_WORDS as Word[],
};

type ContentEntry = {
  meaning?: Partial<Record<Language, string>>;
  example?: string;
  exampleTranslation?: Partial<Record<Language, string>>;
  contexts?: Partial<Record<Language, {
    example: string;
    translation: string;
    source?: 'tatoeba' | 'curated';
  }>>;
  note?: Partial<Record<Language, string>>;
};
const CONTENT = {
  pl: PL_CONTENT,
  en: EN_CONTENT,
  nl: NL_CONTENT,
  fr: FR_CONTENT, de: DE_CONTENT, es: ES_CONTENT, it: IT_CONTENT, sv: SV_CONTENT,
} as Record<Language, Record<number, ContentEntry>>;

export function languageFor(value: unknown): Language {
  const candidate = typeof value === 'string'
    ? value
    : (value as { language?: string } | null)?.language;
  if (candidate === 'nl-from-pl') return 'nl';
  if (candidate === 'pl-from-nl') return 'pl';
  return ['pl', 'en', 'nl', 'fr', 'de', 'es', 'it', 'sv'].includes(candidate ?? '') ? candidate as Language : 'pl';
}

export const wordsFor = (language: unknown) => CORPORA[languageFor(language)];

export function bridgeOf(word: Word, language: unknown, homeLanguage: Language = 'en') {
  return CONTENT[languageFor(language)]?.[word.rank]?.meaning?.[homeLanguage] ?? word.en;
}

export function contextFor(word: Word, language: unknown, homeLanguage: Language = 'en'): LearningContext {
  const content = CONTENT[languageFor(language)]?.[word.rank];
  const variant = content?.contexts?.[homeLanguage];
  return {
    example: variant?.example ?? content?.example ?? word.lemma,
    translation: variant?.translation ?? content?.exampleTranslation?.[homeLanguage] ?? null,
    note: content?.note?.[homeLanguage] ?? null,
    curated: Boolean(content),
    source: variant?.source ?? (content ? 'curated' : null),
  };
}

export function formsFor(word: Word, language: unknown): WordForm[] | null {
  return languageFor(language) === 'pl' ? word.forms ?? [] : null;
}

export function languageName(code: unknown) {
  return { pl: 'Polski · Polish', en: 'English', nl: 'Nederlands · Dutch', fr: 'Français · French', de: 'Deutsch · German', es: 'Español · Spanish', it: 'Italiano · Italian', sv: 'Svenska · Swedish' }[languageFor(code)];
}

export function shortLanguageName(code: unknown) {
  return { pl: 'Polish', en: 'English', nl: 'Dutch', fr: 'French', de: 'German', es: 'Spanish', it: 'Italian', sv: 'Swedish' }[languageFor(code)];
}
