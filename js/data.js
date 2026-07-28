import { PL_WORDS, EN_WORDS, NL_WORDS } from './generated/frequency-data.js';

export { PL_WORDS, EN_WORDS, NL_WORDS };

export const STATE_ORDER = ['new', 'heard', 'recognized', 'known'];
export const STATE_LABEL = { new: 'New', heard: 'Learning', recognized: 'Recognized', known: 'Known' };

const CORPORA = { pl: PL_WORDS, en: EN_WORDS, nl: NL_WORDS };

export function languageFor(settingsOrDir) {
  const value = typeof settingsOrDir === 'string' ? settingsOrDir : settingsOrDir?.language;
  if (value === 'nl-from-pl') return 'nl';
  if (value === 'pl-from-nl') return 'pl';
  return CORPORA[value] ? value : 'pl';
}

export function wordsFor(settingsOrDir) {
  return CORPORA[languageFor(settingsOrDir)];
}

export function bridgeOf(word) {
  return word.en;
}

export function formsFor(word, settingsOrDir) {
  return languageFor(settingsOrDir) === 'pl' ? word.forms : null;
}

export function languageName(code) {
  return ({ pl: 'Polski · Polish', en: 'English', nl: 'Nederlands · Dutch' })[languageFor(code)];
}
