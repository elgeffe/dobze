import { describe, expect, it } from 'vitest';
import { splashLinkTags } from './vite-plugin-ios-splash';

describe('iOS launch images', () => {
  it('derives a device media query from each filename', () => {
    const [tag] = splashLinkTags(['splash-393x852@3.png']);
    expect(tag.attrs).toEqual({
      rel: 'apple-touch-startup-image',
      media: 'screen and (device-width: 393px) and (device-height: 852px)'
        + ' and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      href: './splash/splash-393x852@3.png',
    });
  });

  it('ignores files that are not launch images', () => {
    expect(splashLinkTags(['readme.md', 'icon-192.png', 'splash-430x932@3.png'])).toHaveLength(1);
  });
});
