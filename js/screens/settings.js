import { h, tabBar, toast } from '../ui.js';
import { getState, setDir, exportJSON, importJSON, reset } from '../store.js';
import { go } from '../router.js';

export function renderSettings() {
  const s = getState();
  const dir = s.settings.dir;

  const screen = h('main', { class: 'screen' },
    h('div', { class: 'masthead' },
      h('div', { class: 'masthead-title' }, 'Settings'),
      h('div', { class: 'masthead-sub' }, 'v0.1 · offline · 1 user'),
    ),
    h('div', { style: { padding: '20px 16px 0' } },
      group('Direction',
        row('Learning', dir === 'pl-from-nl' ? 'Polish ← Dutch' : 'Dutch ← Polish',
          () => { setDir(dir === 'pl-from-nl' ? 'nl-from-pl' : 'pl-from-nl'); rerender(); }),
        row('Bridge', dir === 'pl-from-nl' ? 'Dutch' : 'Polish', () => {}),
      ),
      group('Data',
        row('Export progress', 'JSON', () => {
          const blob = new Blob([exportJSON()], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'dobze-' + new Date().toISOString().slice(0,10) + '.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          toast('Downloaded');
        }),
        row('Import progress', '', () => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = 'application/json';
          input.onchange = () => {
            const f = input.files[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
              const ok = importJSON(reader.result);
              toast(ok ? 'Imported' : 'Invalid JSON');
              if (ok) rerender();
            };
            reader.readAsText(f);
          };
          input.click();
        }),
        rowDanger('Reset progress', () => {
          if (confirm('Reset all progress? This cannot be undone.')) {
            reset(); toast('Reset'); rerender();
          }
        }),
      ),
      group('About',
        row('Credits & licenses', '', () => toast('Source Serif 4, Inter Tight, JetBrains Mono')),
        row('Version', '0.1.0', () => {}),
      ),
    ),
    tabBar('hub'),
  );

  return screen;
}

function group(label, ...rows) {
  return h('div', { class: 'settings-group' },
    h('div', { class: 'label' }, label),
    h('div', { class: 'settings-card' }, ...rows),
  );
}

function row(title, detail, onclick) {
  return h('button', { class: 'settings-row', onclick },
    h('div', { class: 'title' }, title),
    detail ? h('div', { class: 'detail' }, detail) : null,
    h('div', { class: 'arrow' }, '›'),
  );
}
function rowDanger(title, onclick) {
  return h('button', { class: 'settings-row danger', onclick },
    h('div', { class: 'title' }, title),
    h('div', { class: 'arrow' }, '›'),
  );
}

function rerender() {
  const ev = new HashChangeEvent('hashchange');
  window.dispatchEvent(ev);
}
