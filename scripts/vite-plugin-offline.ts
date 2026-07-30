import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import type { Plugin } from 'vite';

const BUILD_ID_TOKEN = '__DOBZE_BUILD_ID__';
const PRECACHE_TOKEN = '__DOBZE_PRECACHE__';

/**
 * Source maps are debug-only and iOS launch images are read by the operating
 * system at install time, never by the running app; keeping both out of the
 * precache keeps the offline download to what the app actually needs.
 */
const EXCLUDED = [/\.map$/, /^service-worker\.js$/, /^splash\//, /^\./];

export interface OfflinePluginOptions {
  /** Worker source containing the two injection tokens. */
  template: string;
  /** Directory copied verbatim into the build output (Vite's `publicDir`). */
  publicDir: string;
}

/** Every file below `dir`, as build-output-relative POSIX paths. */
export function listFiles(dir: string, root = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full, root);
    return [relative(root, full).split(/[\\/]/).join(posix.sep)];
  });
}

export function isPrecachable(file: string) {
  return !EXCLUDED.some((pattern) => pattern.test(file));
}

/**
 * Turns build output paths into the relative URLs the worker requests. `base`
 * is `./` so the app can be served from a subdirectory (GitHub Pages), and
 * relative URLs in the worker resolve against the worker's own scope.
 */
export function toPrecacheManifest(files: Iterable<string>): string[] {
  const urls = new Set<string>(['./index.html']);
  for (const file of files) {
    if (isPrecachable(file)) urls.add(`./${file}`);
  }
  return [...urls].sort();
}

export function injectManifest(template: string, buildId: string, precache: string[]): string {
  for (const token of [BUILD_ID_TOKEN, PRECACHE_TOKEN]) {
    if (!template.includes(token)) throw new Error(`Service worker template is missing ${token}`);
  }
  return template
    .replace(BUILD_ID_TOKEN, buildId)
    .replace(PRECACHE_TOKEN, JSON.stringify(precache));
}

/**
 * Emits `service-worker.js` with the finished build's precache manifest baked
 * in. Generating it here — rather than shipping a hand-written list — is what
 * makes offline complete: every hashed chunk, stylesheet, icon, and the app
 * shell itself are stored in one atomic install.
 */
export function offlinePlugin({ template, publicDir }: OfflinePluginOptions): Plugin {
  return {
    name: 'dobze-offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const source = readFileSync(template, 'utf8');
      const publicFiles = listFiles(publicDir);
      const precache = toPrecacheManifest([...Object.keys(bundle), ...publicFiles]);

      const fingerprint = createHash('sha256');
      fingerprint.update(precache.join('\n'));
      // Bundle asset names are content-hashed, but index.html and the public
      // files are not, so mix their bytes in to keep the build id honest.
      for (const file of publicFiles) fingerprint.update(readFileSync(join(publicDir, file)));
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'asset' && !chunk.fileName.endsWith('.map')) fingerprint.update(chunk.source);
      }

      this.emitFile({
        type: 'asset',
        fileName: 'service-worker.js',
        source: injectManifest(source, fingerprint.digest('hex').slice(0, 12), precache),
      });
    },
  };
}
