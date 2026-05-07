import { h } from '../ui.js';
import { setDir, completeOnboarding, getState } from '../store.js';
import { go } from '../router.js';

export function renderOnboarding({ step = '1' }) {
  const stepN = parseInt(step, 10);
  const s = getState();
  const dir = s.settings.dir;

  const screen = h('main', { class: 'screen no-tabs' });
  screen.append(
    h('div', { class: 'onb-progress' },
      ...[1,2,3].map(i => h('i', { class: i === stepN ? 'active' : (i < stepN ? 'done' : '') }))
    )
  );

  if (stepN === 1) {
    screen.append(
      h('div', { class: 'onb-pad' },
        h('div', { class: 'onb-eyebrow' }, 'Step one'),
        h('div', { class: 'onb-title' }, 'What are you', h('br'), 'learning?'),
        h('div', { class: 'onb-sub' }, 'Czego się uczysz? · Wat leer je?'),
        choiceCard('Polski', 'Polish', 'PL', dir === 'pl-from-nl', () => { setDir('pl-from-nl'); rerender(); }),
        choiceCard('Nederlands', 'Dutch', 'NL', dir === 'nl-from-pl', () => { setDir('nl-from-pl'); rerender(); }),
        h('button', { class: 'btn-primary', onclick: () => go('/onboarding/2') }, 'Continue'),
      )
    );
  } else if (stepN === 2) {
    screen.append(
      h('div', { class: 'onb-pad' },
        h('div', { class: 'onb-eyebrow' }, 'Step two'),
        h('div', { class: 'onb-title' }, 'Your strongest', h('br'), 'language?'),
        h('div', { class: 'onb-sub' }, 'Translations will appear in this language.'),
        choiceCard(
          dir === 'pl-from-nl' ? 'Nederlands' : 'Polski',
          dir === 'pl-from-nl' ? 'Dutch' : 'Polish',
          dir === 'pl-from-nl' ? 'NL' : 'PL',
          true, () => {}
        ),
        choiceCard('English', 'English', 'EN', false, () => {}),
        h('button', { class: 'btn-primary', onclick: () => go('/onboarding/3') }, 'Continue'),
      )
    );
  } else {
    screen.append(
      h('div', { class: 'onb-pad' },
        h('div', { class: 'onb-eyebrow' }, 'Ready'),
        h('div', { style: { fontFamily: 'var(--serif)', fontSize: '44px', lineHeight: 1, letterSpacing: '-0.8px', marginBottom: '24px' } }, 'Dobze.'),
        h('div', { style: { fontFamily: 'var(--serif)', fontSize: '19px', lineHeight: 1.45, color: 'var(--ink2)', marginBottom: '8px' } },
          'One thousand words cover four out of five conversations. Your job is to recognise them — one tap at a time.'),
        h('div', { class: 'serif italic', style: { fontSize: '15px', color: 'var(--ink3)', marginTop: '28px' } },
          'Tap any word in the list when you hear it in real life.'),
        h('button', { class: 'btn-primary', style: { marginTop: '60px' }, onclick: () => { completeOnboarding(); go('/hub'); } }, 'Begin'),
      )
    );
  }

  return screen;
}

function choiceCard(title, sub, flag, selected, onclick) {
  return h('button', {
    class: 'choice-card' + (selected ? ' selected' : ''),
    onclick,
  },
    h('div', { class: 'choice-flag' }, flag),
    h('div', { style: { flex: 1 } },
      h('div', { class: 'choice-title' }, title),
      h('div', { class: 'choice-sub' }, sub),
    ),
    selected ? h('div', { class: 'check' }, '✓') : null,
  );
}

function rerender() {
  const ev = new HashChangeEvent('hashchange');
  window.dispatchEvent(ev);
}
