import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { HtmlTagDescriptor, Plugin } from 'vite';

/**
 * Launch images are named `splash-<cssWidth>x<cssHeight>@<ratio>.png` by
 * scripts/build-ios-splash.mjs. Deriving the media query from the filename
 * keeps one list of device sizes instead of two that can drift apart.
 */
const SPLASH_PATTERN = /^splash-(\d+)x(\d+)@(\d)\.png$/;

export function splashLinkTags(files: Iterable<string>): HtmlTagDescriptor[] {
  return [...files]
    .map((file) => SPLASH_PATTERN.exec(file))
    .filter((match): match is RegExpExecArray => match !== null)
    .sort((a, b) => Number(b[2]) - Number(a[2]))
    .map(([file, width, height, ratio]) => ({
      tag: 'link',
      attrs: {
        rel: 'apple-touch-startup-image',
        media: `screen and (device-width: ${width}px) and (device-height: ${height}px)`
          + ` and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
        href: `./splash/${file}`,
      },
      injectTo: 'head' as const,
    }));
}

/** Injects one `apple-touch-startup-image` link per generated launch image. */
export function iosSplashPlugin({ publicDir }: { publicDir: string }): Plugin {
  const splashDir = join(publicDir, 'splash');
  return {
    name: 'dobze-ios-splash',
    transformIndexHtml() {
      if (!existsSync(splashDir)) return [];
      return splashLinkTags(readdirSync(splashDir));
    },
  };
}
