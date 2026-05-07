// Simple hash router.

const routes = [];

export function route(pattern, handler) {
  // Pattern: '/hub', '/word/:rank', etc.
  const keys = [];
  const regex = new RegExp(
    '^' + pattern.replace(/:[A-Za-z]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$'
  );
  routes.push({ regex, keys, handler });
}

export function go(path) { location.hash = '#' + path; }

export function start() {
  window.addEventListener('hashchange', dispatch);
  window.addEventListener('load', dispatch);
  if (document.readyState !== 'loading') dispatch();
}

function dispatch() {
  const path = (location.hash || '#/').slice(1) || '/';
  for (const r of routes) {
    const m = r.regex.exec(path);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1]));
      r.handler(params);
      return;
    }
  }
  // Fallback
  routes[0]?.handler({});
}

export function currentPath() {
  return (location.hash || '#/').slice(1) || '/';
}
