import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { online, watchConnectivity } from './offline';

describe('connectivity', () => {
  it('starts from the current state and follows transitions', () => {
    const stop = watchConnectivity(window, false);
    expect(get(online)).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(get(online)).toBe(true);

    window.dispatchEvent(new Event('offline'));
    expect(get(online)).toBe(false);

    stop();
  });

  it('stops listening once torn down', () => {
    const stop = watchConnectivity(window, false);
    stop();
    window.dispatchEvent(new Event('online'));
    expect(get(online)).toBe(false);
  });
});
