import { h, tabBar, dateLabel } from '../ui.js';
import { getState } from '../store.js';
import { wordsFor, languageName } from '../data.js';
import { dueCards } from '../fsrs.js';

export function renderHub() {
  const s = getState();
  const language = s.settings.language;
  const list = wordsFor(language);
  const counts = { known: 0, recognized: 0, heard: 0, new: 0 };
  for (const w of list) counts[s.words[`${language}:${w.rank}`]?.state || 'new']++;
  const recognised = counts.known + counts.recognized;
  const pct = Math.round(recognised / 10);
  const due = dueCards(s.words).filter(k => k.startsWith(language + ':')).length;
  const ready = Math.max(due, Math.min(20, counts.new));

  return h('main', { class: 'screen' },
    h('div', { class: 'masthead' },
      h('div', { class: 'masthead-row' },
        h('div', { class: 'serif italic', style: { fontSize: '14px', color: 'var(--ink3)' } }, dateLabel()),
        h('a', { href: '#/settings', class: 'mono', style: { fontSize: '11px', color: 'var(--ink3)' } }, 'SETTINGS'),
      ),
      h('div', { class: 'masthead-rule' }),
      h('div', { class: 'masthead-title' }, 'Dobze.'),
      h('div', { class: 'masthead-sub' }, 'Learning ' + languageName(language)),
    ),
    h('section', { class: 'review-hero' },
      h('div', { class: 'eyebrow' }, 'Your daily practice'),
      h('h1', null, 'Make the words stick.'),
      h('p', null, 'Review adapts to your memory. Difficult and new words return often; well-known words wait longer.'),
      h('a', { class: 'btn-primary', href: '#/review' }, `Start review · ${ready} words`),
    ),
    h('a', { class: 'coverage-card', href: '#/coverage' },
      h('div', { class: 'eyebrow' }, 'Local progress'),
      h('div', { class: 'coverage-row' },
        h('div', { class: 'inkwell' }, h('span', { class: 'inkwell-fill', style: { height: pct + '%' } })),
        h('div', null,
          h('div', { class: 'coverage-num' }, pct, h('span', { class: 'coverage-pct' }, '%')),
          h('div', { class: 'coverage-meta', style: { textAlign: 'left' } }, `${recognised} of 1,000 recognized`),
        ),
      ),
    ),
    h('div', { class: 'section' },
      h('a', { class: 'row-tile', href: '#/list' },
        h('div', { class: 'row-tile-body' },
          h('div', { class: 'row-tile-title' }, 'Explore all 1,000 words'),
          h('div', { class: 'row-tile-sub' }, language === 'pl' ? 'Including Polish word families and grammatical forms' : 'Ranked by real subtitle frequency'),
        ),
        h('div', { class: 'row-tile-arrow' }, '→'),
      ),
    ),
    tabBar('hub'),
  );
}
