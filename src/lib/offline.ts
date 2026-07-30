import { writable } from 'svelte/store';

export type OfflineStatus = 'unsupported' | 'installing' | 'ready';

/** Live connectivity. Dobze works either way — this only drives what we tell the user. */
export const online = writable(true);

/**
 * `ready` means the worker has activated and taken control, which can only
 * happen after its install step precached every file in the build. So an
 * active controller is a reliable "the whole app is on this device" signal.
 */
export const offlineStatus = writable<OfflineStatus>('installing');

/** A newer build finished downloading and is waiting for a reload. */
export const updateReady = writable(false);

let waiting: ServiceWorker | null = null;
/** Set when the user accepts an update, so the resulting claim triggers one reload. */
let reloadOnControllerChange = false;

/** Reloads into the build that is already sitting in the cache. */
export function applyUpdate() {
  if (!waiting) return;
  reloadOnControllerChange = true;
  waiting.postMessage('SKIP_WAITING');
  waiting = null;
  updateReady.set(false);
}

export function watchConnectivity(
  target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  initial: boolean,
) {
  online.set(initial);
  const goOnline = () => online.set(true);
  const goOffline = () => online.set(false);
  target.addEventListener('online', goOnline);
  target.addEventListener('offline', goOffline);
  return () => {
    target.removeEventListener('online', goOnline);
    target.removeEventListener('offline', goOffline);
  };
}

function trackInstallation(registration: ServiceWorkerRegistration) {
  const worker = registration.installing ?? registration.waiting;
  if (!worker) return;

  const check = () => {
    if (worker.state !== 'installed') return;
    worker.removeEventListener('statechange', check);
    // An existing controller means this install replaces a running build. The
    // first install has no controller to replace and activates on its own.
    if (!navigator.serviceWorker.controller) return;
    waiting = worker;
    updateReady.set(true);
  };

  if (worker.state === 'installed') check();
  else worker.addEventListener('statechange', check);
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    offlineStatus.set('unsupported');
    return;
  }
  if (navigator.serviceWorker.controller) offlineStatus.set('ready');

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    offlineStatus.set('ready');
    if (!reloadOnControllerChange) return;
    reloadOnControllerChange = false;
    window.location.reload();
  });

  navigator.serviceWorker
    .register('./service-worker.js')
    .then((registration) => {
      trackInstallation(registration);
      registration.addEventListener('updatefound', () => trackInstallation(registration));
    })
    .catch(() => offlineStatus.set('unsupported'));
}

/** Wires connectivity plus, in production, the offline worker. Returns a teardown. */
export function startOfflineSupport() {
  const stop = watchConnectivity(window, navigator.onLine);
  // Service workers need HTTPS or localhost and are intentionally off in dev.
  if (import.meta.env.PROD) registerServiceWorker();
  else offlineStatus.set('unsupported');
  return stop;
}
