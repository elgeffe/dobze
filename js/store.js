// Persistent app state via localStorage.
// State shape:
//   { settings: { dir, onboarded }, words: { [rank]: { state, formsHeard, fsrs } }, capture: { activeSession, sessions[] } }

import { PL_WORDS, NL_WORDS } from './data.js';
import { newCard } from './fsrs.js';

const KEY = 'dobze.v1';
const listeners = new Set();

function defaultState() {
  const words = {};
  for (const w of PL_WORDS) {
    words[`pl:${w.rank}`] = { state: w.seed, formsHeard: 0, fsrs: newCard() };
  }
  for (const w of NL_WORDS) {
    words[`nl:${w.rank}`] = { state: w.seed, formsHeard: 0, fsrs: newCard() };
  }
  // Hand-tuned forms-heard so the design feels lived-in
  const FORMS_HEARD = {
    'pl:1':3,'pl:14':2,'pl:10':3,'pl:11':2,'pl:4':1,'pl:5':1,
    'pl:18':2,'pl:25':1,'pl:12':2,'pl:44':1,'pl:42':1,'pl:43':1,
    'pl:19':1,'pl:20':2,'pl:45':1,'pl:35':0,
  };
  for (const [k, n] of Object.entries(FORMS_HEARD)) {
    if (words[k]) words[k].formsHeard = n;
  }
  return {
    settings: { dir: 'pl-from-nl', onboarded: false, theme: 'light' },
    words,
    capture: { activeSession: null, sessions: [] },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Shallow-merge so older saves still work
    return Object.assign(defaultState(), parsed, {
      words: Object.assign(defaultState().words, parsed.words || {}),
    });
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
  const ns = dir === 'nl-from-pl' ? 'nl' : 'pl';
  return state.words[`${ns}:${rank}`];
}
export function getWordKey(dir, rank) {
  const ns = dir === 'nl-from-pl' ? 'nl' : 'pl';
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

export function setDir(dir) {
  update((s) => { s.settings.dir = dir; });
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

export function bumpForm(dir, rank) {
  const key = getWordKey(dir, rank);
  update((s) => {
    const w = s.words[key];
    if (!w) return;
    w.formsHeard = Math.min(3, (w.formsHeard || 0) + 1);
    // First tap: new -> heard. Subsequent: heard -> recognized after enough taps.
    if (w.state === 'new') w.state = 'heard';
    else if (w.state === 'heard' && w.formsHeard >= 2) w.state = 'recognized';
  });
}

// Capture session management
export function startSession(name) {
  const stamp = Date.now();
  update((s) => {
    s.capture.activeSession = {
      id: stamp,
      name: name || sessionNameFor(new Date()),
      startedAt: stamp,
      taps: [], // [{rank, dir, ts}]
    };
  });
}
export function endSession() {
  update((s) => {
    if (!s.capture.activeSession) return;
    s.capture.sessions.unshift(s.capture.activeSession);
    s.capture.activeSession = null;
  });
}
export function tapInSession(dir, rank) {
  const ns = dir === 'nl-from-pl' ? 'nl' : 'pl';
  update((s) => {
    if (!s.capture.activeSession) {
      // Auto-start a session
      const stamp = Date.now();
      s.capture.activeSession = {
        id: stamp,
        name: sessionNameFor(new Date()),
        startedAt: stamp,
        taps: [],
      };
    }
    s.capture.activeSession.taps.push({ ns, rank, ts: Date.now() });
    const key = `${ns}:${rank}`;
    const w = s.words[key];
    if (!w) return;
    w.formsHeard = Math.min(3, (w.formsHeard || 0) + 1);
    if (w.state === 'new') w.state = 'heard';
    else if (w.state === 'heard' && w.formsHeard >= 2) w.state = 'recognized';
  });
}

function sessionNameFor(d) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return `${days[d.getDay()]} session`;
}

export function reset() {
  update((s) => {
    const fresh = defaultState();
    s.settings = fresh.settings;
    s.words = fresh.words;
    s.capture = fresh.capture;
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
      Object.assign(s.capture, parsed.capture || {});
    });
    return true;
  } catch { return false; }
}
