// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { injectManifest, isPrecachable, toPrecacheManifest } from './vite-plugin-offline';

const template = readFileSync(fileURLToPath(new URL('../src/sw/service-worker.js', import.meta.url)), 'utf8');

describe('precache manifest', () => {
  it('keeps the assets the app needs and drops the ones it does not', () => {
    expect(isPrecachable('assets/index-abc123.js')).toBe(true);
    expect(isPrecachable('icons/icon-192.png')).toBe(true);
    expect(isPrecachable('assets/index-abc123.js.map')).toBe(false);
    expect(isPrecachable('service-worker.js')).toBe(false);
    expect(isPrecachable('splash/splash-430x932@3.png')).toBe(false);
    expect(isPrecachable('.nojekyll')).toBe(false);
  });

  it('lists every shipped file once, as a relative URL', () => {
    expect(toPrecacheManifest([
      'index.html',
      'assets/index-abc123.js',
      'assets/index-abc123.js.map',
      'service-worker.js',
      'manifest.webmanifest',
    ])).toEqual([
      './assets/index-abc123.js',
      './index.html',
      './manifest.webmanifest',
    ]);
  });

  it('always includes the app shell so navigations work offline', () => {
    expect(toPrecacheManifest([])).toEqual(['./index.html']);
  });
});

describe('worker injection', () => {
  it('produces a syntactically valid worker carrying the manifest', () => {
    const worker = injectManifest(template, 'abc123', ['./index.html', './assets/app.js']);
    expect(worker).toContain("const BUILD_ID = 'abc123'");
    expect(worker).toContain('["./index.html","./assets/app.js"]');
    expect(() => new Function(worker)).not.toThrow();
  });

  it('fails loudly rather than shipping a worker that caches nothing', () => {
    expect(() => injectManifest('self.addEventListener("install", () => {});', 'abc123', []))
      .toThrow(/__DOBZE_BUILD_ID__/);
  });
});
