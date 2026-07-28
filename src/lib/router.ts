import { writable } from 'svelte/store';

export type Route =
  | { name: 'onboarding'; step: number }
  | { name: 'hub' | 'coverage' | 'list' | 'review' | 'settings' }
  | { name: 'word'; rank: number };

export function parseRoute(hash: string): Route {
  const path = (hash || '#/').replace(/^#/, '');
  const onboarding = /^\/onboarding\/(\d+)$/.exec(path);
  if (onboarding) return { name: 'onboarding', step: Math.min(3, Math.max(1, Number(onboarding[1]))) };
  const word = /^\/word\/(\d+)$/.exec(path);
  if (word) return { name: 'word', rank: Number(word[1]) };
  if (path === '/' || path === '/hub') return { name: 'hub' };
  if (path === '/coverage') return { name: 'coverage' };
  if (path === '/list') return { name: 'list' };
  if (path === '/review') return { name: 'review' };
  if (path === '/settings') return { name: 'settings' };
  return { name: 'hub' };
}

export const route = writable<Route>(
  typeof window === 'undefined' ? { name: 'hub' } : parseRoute(window.location.hash),
);

export function navigate(path: string) {
  window.location.hash = `#${path}`;
}

export function startRouter() {
  const update = () => route.set(parseRoute(window.location.hash));
  window.addEventListener('hashchange', update);
  update();
  return () => window.removeEventListener('hashchange', update);
}
