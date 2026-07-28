// Persistent app state via localStorage.
// State shape:
//   { settings: { language, onboarded }, words: { [language:rank]: { state, fsrs } } }

import { PL_WORDS, EN_WORDS, NL_WORDS, languageFor } from './data.js';
import { newCard } from './fsrs.js';

const KEY = 'dobze.v1';
const listeners = new Set();

function defaultState() {
  const words = {};
  for (const [language, corpus] of Object.entries({ pl: PL_WORDS, en: EN_WORDS, nl: NL_WORDS })) {
    for (const w of corpus) words[`${language}:${w.rank}`] = { state: 'new', fsrs: newCard() };
  }
  return {
    settings: { language: 'pl', onboarded: false, theme: 'light' },
    words,
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Shallow-merge so older saves still work
    const merged = Object.assign(defaultState(), parsed, {
      words: Object.assign(defaultState().words, parsed.words || {}),
    });
    merged.settings.language = languageFor(parsed.settings?.language || parsed.settings?.dir);
    delete merged.capture;
    return merged;
  } catch {
    return defaultState();
  }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function getState() { return state; }
export function getSettings() { return state.settings; }
export function getWord(dir, rank) {
  const ns = languageFor(dir);
  return state.words[`${ns}:${rank}`];
}
export function getWordKey(dir, rank) {
  const ns = languageFor(dir);
  return `${ns}:${rank}`;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn(state);
}

export function update(mut) {
  mut(state);
  persist();
  emit();
}

export function setLanguage(language) {
  update((s) => { s.settings.language = languageFor(language); });
}

export function completeOnboarding() {
  update((s) => { s.settings.onboarded = true; });
}

export function setWordState(dir, rank, newState) {
  const key = getWordKey(dir, rank);
  update((s) => {
    if (!s.words[key]) s.words[key] = { state: 'new', formsHeard: 0, fsrs: newCard() };
    s.words[key].state = newState;
  });
}

export function reset() {
  update((s) => {
    const fresh = defaultState();
    s.settings = fresh.settings;
    s.words = fresh.words;
  });
}

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  try {
    const parsed = JSON.parse(text);
    update((s) => {
      Object.assign(s.settings, parsed.settings || {});
      Object.assign(s.words, parsed.words || {});
    });
    return true;
  } catch { return false; }
}
