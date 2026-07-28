import { h } from '../ui.js';
import { setLanguage, setHomeLanguage, completeOnboarding, getState } from '../store.js';
import { go } from '../router.js';

export function renderOnboarding({ step = '1' }) {
  const stepN = parseInt(step, 10);
  const language = getState().settings.language;
  const homeLanguage = getState().settings.homeLanguage;
  const screen = h('main', { class: 'screen no-tabs' },
    h('div', { class: 'onb-progress' }, ...[1,2,3].map(i => h('i', { class: i === stepN ? 'active' : (i < stepN ? 'done' : '') }))),
  );
  if (stepN === 1) {
    screen.append(h('div', { class: 'onb-pad' },
      h('div', { class: 'onb-eyebrow' }, 'Choose a language'),
      h('div', { class: 'onb-title' }, 'What are you', h('br'), 'learning?'),
      choice('Polski', 'Polish', 'PL', language === 'pl', () => choose('pl')),
      choice('English', 'English', 'EN', language === 'en', () => choose('en')),
      choice('Nederlands', 'Dutch', 'NL', language === 'nl', () => choose('nl')),
      h('button', { class: 'btn-primary', onclick: () => go('/onboarding/2') }, 'Continue'),
    ));
  } else if (stepN === 2) {
    screen.append(h('div', { class: 'onb-pad' },
      h('div', { class: 'onb-eyebrow' }, 'Choose your home language'),
      h('div', { class: 'onb-title' }, 'Translate words', h('br'), 'into…'),
      h('p', { class: 'onb-sub' }, 'Meanings, example translations, and grammar notes will use this language.'),
      choice('Polski', 'Polish', 'PL', homeLanguage === 'pl', () => chooseHome('pl')),
      choice('English', 'English', 'EN', homeLanguage === 'en', () => chooseHome('en')),
      choice('Nederlands', 'Dutch', 'NL', homeLanguage === 'nl', () => chooseHome('nl')),
      h('button', { class: 'btn-primary', onclick: () => go('/onboarding/3') }, 'Continue'),
    ));
  } else {
    screen.append(h('div', { class: 'onb-pad' },
      h('div', { class: 'onb-eyebrow' }, 'Ready'),
      h('div', { class: 'onb-title' }, 'Review what', h('br'), 'matters.'),
      h('p', { class: 'onb-sub' }, 'Start with the most frequent words. Your ratings stay on this device and decide what comes back next.'),
      h('button', { class: 'btn-primary', style: { marginTop: '60px' }, onclick: () => { completeOnboarding(); go('/review'); } }, 'Start first review'),
    ));
  }
  return screen;
}
function choice(title, sub, flag, selected, onclick) {
  return h('button', { class: 'choice-card' + (selected ? ' selected' : ''), onclick },
    h('div', { class: 'choice-flag' }, flag), h('div', { style: { flex: 1 } }, h('div', { class: 'choice-title' }, title), h('div', { class: 'choice-sub' }, sub)),
    selected ? h('div', { class: 'check' }, '✓') : null);
}
function choose(language) { setLanguage(language); window.dispatchEvent(new HashChangeEvent('hashchange')); }
function chooseHome(language) { setHomeLanguage(language); window.dispatchEvent(new HashChangeEvent('hashchange')); }
