import { get, writable, type Writable } from 'svelte/store';
import { wordsFor, languageFor } from './data';
import { newCard } from './fsrs';
import { LANGUAGES, type AppState, type Language, type WordProgress, type WordState } from './types';

export const STORAGE_KEY = 'dobze.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createDefaultState(): AppState {
  return {
    settings: {
      language: 'pl',
      homeLanguage: 'en',
      onboarded: false,
      theme: 'light',
    },
    // Progress is created on first rating rather than up front. Materialising
    // all eight corpora meant 8,000 identical blank cards — about 0.71 MB —
    // written to localStorage before the user had reviewed anything, and
    // re-serialised on every single state change.
    words: {},
  };
}

export const progressKey = (language: Language, rank: number) => `${language}:${rank}`;

// A word with no stored entry has never been reviewed, which is exactly what a
// blank card represents. Callers can treat the two as the same thing.
export function progressFor(state: AppState, key: string): WordProgress {
  return state.words[key] ?? { state: 'new', fsrs: newCard() };
}

const KEY_PATTERN = /^([a-z]{2}):(\d+)$/;

function knownKey(key: string) {
  const match = KEY_PATTERN.exec(key);
  if (!match) return false;
  const [, language, rank] = match;
  if (!(LANGUAGES as readonly string[]).includes(language)) return false;
  const parsed = Number(rank);
  return parsed >= 1 && parsed <= wordsFor(language).length;
}

// A blank card is indistinguishable from an absent one, so dropping them keeps
// stored state proportional to what the user has actually done. This also
// shrinks the 8,000-entry blob left behind by earlier versions on first load.
function isUntouched(progress: WordProgress) {
  return progress.state === 'new' && progress.fsrs.reps === 0 && progress.fsrs.lastReviewAt === 0;
}

function isWordState(value: unknown): value is WordState {
  return value === 'new' || value === 'heard' || value === 'recognized' || value === 'known';
}

function validProgress(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Record<string, unknown>;
  const card = progress.fsrs as Record<string, unknown> | undefined;
  return isWordState(progress.state) && Boolean(card) &&
    ['s', 'd', 'reps', 'lapses', 'lastReviewAt', 'dueAt'].every((key) =>
      typeof card?.[key] === 'number' && Number.isFinite(card[key]));
}

function normalise(raw: unknown, strict = false): AppState {
  const defaults = createDefaultState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    if (strict) throw new Error('Invalid state');
    return defaults;
  }
  const parsed = raw as Partial<AppState> & { settings?: Record<string, unknown> };
  const settings: Record<string, unknown> =
    parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
  if (strict && (typeof settings !== 'object' || !parsed.words || typeof parsed.words !== 'object')) {
    throw new Error('Invalid state');
  }
  const words = { ...defaults.words };
  for (const [key, value] of Object.entries(parsed.words ?? {})) {
    if (knownKey(key) && validProgress(value)) {
      const progress = structuredClone(value) as WordProgress;
      if (!isUntouched(progress)) words[key] = progress;
    } else if (strict) throw new Error(`Invalid progress at ${key}`);
  }
  return {
    settings: {
      ...defaults.settings,
      ...settings,
      language: languageFor(settings.language ?? settings.dir),
      homeLanguage: 'en',
      onboarded: Boolean(settings.onboarded),
      theme: 'light',
    },
    words,
  };
}

export function createAppStore(storage?: StorageLike) {
  let initial = createDefaultState();
  if (storage) {
    try {
      const saved = storage.getItem(STORAGE_KEY);
      if (saved) initial = normalise(JSON.parse(saved));
    } catch {
      initial = createDefaultState();
    }
  }

  const state: Writable<AppState> = writable(initial);
  if (storage) {
    state.subscribe((value) => {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // Storage may be unavailable or full; the in-memory app remains usable.
      }
    });
  }

  const update = (mutator: (draft: AppState) => void) => {
    state.update((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  };

  return {
    subscribe: state.subscribe,
    snapshot: () => get(state),
    update,
    setLanguage: (language: Language) => update((draft) => { draft.settings.language = language; }),
    setHomeLanguage: (language: Language) => update((draft) => { draft.settings.homeLanguage = language; }),
    completeOnboarding: () => update((draft) => { draft.settings.onboarded = true; }),
    setWordState: (language: Language, rank: number, wordState: WordState) =>
      update((draft) => {
        const key = progressKey(language, rank);
        draft.words[key] = { ...progressFor(draft, key), state: wordState };
      }),
    reset: () => state.set(createDefaultState()),
    exportJSON: () => JSON.stringify(get(state), null, 2),
    importJSON: (text: string) => {
      try {
        state.set(normalise(JSON.parse(text), true));
        return true;
      } catch {
        return false;
      }
    },
  };
}

const browserStorage = typeof window === 'undefined' ? undefined : window.localStorage;
export const appStore = createAppStore(browserStorage);
