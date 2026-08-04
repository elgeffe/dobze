import { LANGUAGES, type Language, type LearningContext, type Word, type WordForm, type WordState } from './types';

export const STATE_ORDER: WordState[] = ['new', 'heard', 'recognized', 'known'];
export const STATE_LABEL: Record<WordState, string> = {
  new: 'New',
  heard: 'Learning',
  recognized: 'Recognized',
  known: 'Known',
};

export type ContentEntry = {
  // The word this entry describes. Ranks move when the frequency lists are
  // rebuilt, so the lemma is what ties content back to its word.
  lemma?: string;
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
// The corpora are generated JSON; see src/data/PROVENANCE.md. Globbing them
// keeps the language list in types.ts alone rather than repeating it once per
// import, and makes a missing file a startup error instead of an `undefined`
// surfacing inside a component. src/data/corpus.test.ts validates the shape
// that the glob itself cannot type.
const frequencyModules = import.meta.glob<Word[]>('../data/frequency/*.json', {
  eager: true,
  import: 'default',
});
const contentModules = import.meta.glob<Record<string, ContentEntry>>('../data/content/*.json', {
  eager: true,
  import: 'default',
});

function byLanguage<T>(modules: Record<string, T>, kind: string): Record<Language, T> {
  const table = {} as Record<Language, T>;
  for (const language of LANGUAGES) {
    const loaded = modules[`../data/${kind}/${language}.json`];
    if (!loaded) throw new Error(`Missing ${kind} data for language "${language}"`);
    table[language] = loaded;
  }
  return table;
}

const CORPORA = byLanguage(frequencyModules, 'frequency');
const CONTENT = byLanguage(contentModules, 'content');

export function languageFor(value: unknown): Language {
  const candidate = typeof value === 'string'
    ? value
    : (value as { language?: string } | null)?.language;
  if (candidate === 'nl-from-pl') return 'nl';
  if (candidate === 'pl-from-nl') return 'pl';
  return (LANGUAGES as readonly string[]).includes(candidate ?? '')
    ? candidate as Language
    : 'pl';
}

export const wordsFor = (language: unknown) => CORPORA[languageFor(language)];

export const contentFor = (language: unknown) => CONTENT[languageFor(language)];

export function bridgeOf(word: Word, language: unknown, homeLanguage: Language = 'en') {
  return CONTENT[languageFor(language)]?.[String(word.rank)]?.meaning?.[homeLanguage] ?? word.en;
}

export function contextFor(word: Word, language: unknown, homeLanguage: Language = 'en'): LearningContext {
  const content = CONTENT[languageFor(language)]?.[String(word.rank)];
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

export interface LanguageProfile {
  endonym: string;
  english: string;
  flag: string;
}

// Every gloss and example translation in src/data/content is keyed to English,
// so English is the bridge rather than something you can set out to learn.
export const BRIDGE_LANGUAGE: Language = 'en';

// The one place a language is described. Record<Language, …> means the
// compiler, not a reviewer, notices when a ninth language arrives without a
// name or a flag.
const LANGUAGE_PROFILES: Record<Language, LanguageProfile> = {
  pl: { endonym: 'Polski', english: 'Polish', flag: '🇵🇱' },
  en: { endonym: 'English', english: 'English', flag: '🇬🇧' },
  nl: { endonym: 'Nederlands', english: 'Dutch', flag: '🇳🇱' },
  fr: { endonym: 'Français', english: 'French', flag: '🇫🇷' },
  de: { endonym: 'Deutsch', english: 'German', flag: '🇩🇪' },
  es: { endonym: 'Español', english: 'Spanish', flag: '🇪🇸' },
  it: { endonym: 'Italiano', english: 'Italian', flag: '🇮🇹' },
  sv: { endonym: 'Svenska', english: 'Swedish', flag: '🇸🇪' },
};

export const TARGET_LANGUAGES: Language[] =
  LANGUAGES.filter((code) => code !== BRIDGE_LANGUAGE);

export const languageProfile = (code: unknown) => LANGUAGE_PROFILES[languageFor(code)];

export function languageName(code: unknown) {
  const { endonym, english } = languageProfile(code);
  return endonym === english ? english : `${endonym} · ${english}`;
}

export const shortLanguageName = (code: unknown) => languageProfile(code).english;
