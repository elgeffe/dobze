#!/usr/bin/env node
/*
 * Generates the `apple-touch-startup-image` set.
 *
 * Without these, iOS shows a blank white rectangle between tapping the home
 * screen icon and the first paint — jarring against a paper-coloured app.
 * Each file is the paper background with the Dobze mark, sized for one
 * iPhone screen (the Dynamic Island models included).
 *
 * The filename encodes CSS width, height, and pixel ratio; the Vite plugin in
 * scripts/vite-plugin-ios-splash.ts turns that back into a media query, so
 * this list is the only place device sizes are written down.
 *
 *   node scripts/build-ios-splash.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/** CSS pixel size and pixel ratio of every iPhone worth shipping an image for. */
const DEVICES = [
  { width: 440, height: 956, ratio: 3, note: 'iPhone 16 Pro Max' },
  { width: 430, height: 932, ratio: 3, note: 'iPhone 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max' },
  { width: 402, height: 874, ratio: 3, note: 'iPhone 16 Pro' },
  { width: 393, height: 852, ratio: 3, note: 'iPhone 16, 15 Pro, 15, 14 Pro' },
  { width: 428, height: 926, ratio: 3, note: 'iPhone 14 Plus, 13 Pro Max, 12 Pro Max' },
  { width: 390, height: 844, ratio: 3, note: 'iPhone 14, 13, 13 Pro, 12, 12 Pro' },
  { width: 375, height: 812, ratio: 3, note: 'iPhone 13 mini, 12 mini, 11 Pro, XS, X' },
  { width: 414, height: 896, ratio: 3, note: 'iPhone 11 Pro Max, XS Max' },
  { width: 414, height: 896, ratio: 2, note: 'iPhone 11, XR' },
  { width: 414, height: 736, ratio: 3, note: 'iPhone 8 Plus' },
  { width: 375, height: 667, ratio: 2, note: 'iPhone SE (2nd, 3rd), 8, 7, 6s' },
  { width: 320, height: 568, ratio: 2, note: 'iPhone SE (1st)' },
];

const PAPER = [0xf4, 0xef, 0xe6];
const INK = [0x1f, 0x1a, 0x14];

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** Coverage of a pixel by a disc, softened over one pixel for anti-aliasing. */
const disc = (x, y, cx, cy, r) => clamp01(r + 0.5 - Math.hypot(x - cx, y - cy));
/** Coverage of a pixel by the half-plane below `edge`. */
const below = (y, edge) => clamp01(y - edge + 0.5);

const mix = (from, to, amount) => from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount));

/**
 * Paints the brand mark: an ink disc with a paper bowl cut out of the lower
 * half, matching the inline SVG in the masthead (24-unit viewBox, disc at
 * 12,12 r9; bowl at 12,13.5 r6.5).
 */
function render(width, height) {
  const pixels = Buffer.alloc(width * height * 3);
  const unit = Math.min(width, height) * 0.2 / 18; // mark diameter = 20% of the short edge
  const cx = width / 2;
  const cy = height * 0.44;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const inkCoverage = disc(px, py, cx, cy, 9 * unit);
      const bowlCoverage = Math.min(
        disc(px, py, cx, cy + 1.5 * unit, 6.5 * unit),
        below(py, cy + 1.5 * unit),
      );
      const colour = mix(mix(PAPER, INK, inkCoverage), PAPER, bowlCoverage);
      pixels.set(colour, (y * width + x) * 3);
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Minimal 8-bit truecolour PNG; no dependency is worth pulling in for this. */
function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputDir = fileURLToPath(new URL('../public/splash/', import.meta.url));
mkdirSync(outputDir, { recursive: true });

for (const { width, height, ratio, note } of DEVICES) {
  const name = `splash-${width}x${height}@${ratio}.png`;
  const png = encodePng(width * ratio, height * ratio, render(width * ratio, height * ratio));
  writeFileSync(join(outputDir, name), png);
  console.log(`${name.padEnd(24)} ${String(png.length).padStart(7)} bytes  ${note}`);
}
