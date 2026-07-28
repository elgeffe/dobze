import { route, start, go } from './router.js';
import { getState, subscribe } from './store.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderHub } from './screens/hub.js';
import { renderCoverage } from './screens/coverage.js';
import { renderList } from './screens/list.js';
import { renderWord } from './screens/word.js';
import { renderReview } from './screens/review.js';
import { renderSettings } from './screens/settings.js';

const app = document.getElementById('app');

function mount(node) {
  // Strip any open sheet/scrim
  document.querySelectorAll('.scrim, .sheet').forEach(el => el.remove());
  app.replaceChildren(node);
  window.scrollTo({ top: 0 });
}

function guard(handler) {
  return (params) => {
    const s = getState();
    if (!s.settings.onboarded && !location.hash.startsWith('#/onboarding')) {
      go('/onboarding/1');
      return;
    }
    mount(handler(params));
  };
}

route('/onboarding/:step', (p) => mount(renderOnboarding(p)));
route('/hub',      guard(renderHub));
route('/coverage', guard(renderCoverage));
route('/list',     guard(renderList));
route('/word/:rank', guard(renderWord));
route('/review',   guard(renderReview));
route('/settings', guard(renderSettings));
route('/',         guard(renderHub));

start();

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

// Re-render on store updates only when on a screen that doesn't manage it itself
let lastHash = location.hash;
subscribe(() => {
  if (location.hash === lastHash) {
    // No-op — screens trigger their own redraw via dispatched hashchange
  }
});
window.addEventListener('hashchange', () => { lastHash = location.hash; });
