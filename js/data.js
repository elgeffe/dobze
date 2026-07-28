import { PL_WORDS, EN_WORDS, NL_WORDS } from './generated/frequency-data.js';
import { PL_CONTENT } from './content/pl.js';
import { EN_CONTENT } from './content/en.js';
import { NL_CONTENT } from './content/nl.js';

export { PL_WORDS, EN_WORDS, NL_WORDS };

export const STATE_ORDER = ['new', 'heard', 'recognized', 'known'];
export const STATE_LABEL = { new: 'New', heard: 'Learning', recognized: 'Recognized', known: 'Known' };

const CORPORA = { pl: PL_WORDS, en: EN_WORDS, nl: NL_WORDS };
const CONTENT = { pl: PL_CONTENT, en: EN_CONTENT, nl: NL_CONTENT };

export function languageFor(settingsOrDir) {
  const value = typeof settingsOrDir === 'string' ? settingsOrDir : settingsOrDir?.language;
  if (value === 'nl-from-pl') return 'nl';
  if (value === 'pl-from-nl') return 'pl';
  return CORPORA[value] ? value : 'pl';
}

export function wordsFor(settingsOrDir) {
  return CORPORA[languageFor(settingsOrDir)];
}

export function bridgeOf(word, settingsOrLanguage, homeLanguage = 'en') {
  const learningLanguage = languageFor(settingsOrLanguage);
  return CONTENT[learningLanguage]?.[word.rank]?.meaning?.[homeLanguage]
    || word.en;
}

export function contextFor(word, settingsOrLanguage, homeLanguage = 'en') {
  const learningLanguage = languageFor(settingsOrLanguage);
  const content = CONTENT[learningLanguage]?.[word.rank];
  return {
    example: content?.example || word.lemma,
    translation: content?.exampleTranslation?.[homeLanguage] || null,
    note: content?.note?.[homeLanguage] || null,
    curated: Boolean(content),
  };
}

export function formsFor(word, settingsOrDir) {
  return languageFor(settingsOrDir) === 'pl' ? word.forms : null;
}

export function languageName(code) {
  return ({ pl: 'Polski · Polish', en: 'English', nl: 'Nederlands · Dutch' })[languageFor(code)];
}

export function shortLanguageName(code) {
  return ({ pl: 'Polish', en: 'English', nl: 'Dutch' })[languageFor(code)];
}
