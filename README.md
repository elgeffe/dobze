# Dobze

A local-first frequency trainer for Polish, Dutch, French, German, Spanish, Italian, and Swedish, bridged through English. Review is the core workflow: new and difficult words appear frequently, while well-known words are scheduled further apart.

## Word data

The app ships with the actual 1,000 most frequent subtitle tokens for each language, extracted from the [FrequencyWords OpenSubtitles 2018 corpora](https://github.com/hermitdave/FrequencyWords) (CC BY-SA 4.0). Polish dictionary forms and transformations are generated offline with [Morfeusz 2](https://morfeusz.sgjp.pl/); no user data or progress leaves the device.

Context sentences and their direct translations are sourced from
[Tatoeba](https://tatoeba.org/) through the OPUS Tatoeba language-pair
archives wherever suitable pairs exist. Tatoeba sentence data is distributed
under [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/).

Regenerate the checked-in offline corpus with:

```bash
python3 -m pip install morfeusz2
python3 scripts/build-frequency-data.py
```

Regenerate contextual content from the cached/downloaded Tatoeba archives with:

```bash
python3 scripts/build-tatoeba-content.py
```

## Development

Install the pinned dependencies and start Vite:

```bash
npm ci
npm run dev
```

Run the production checks with:

```bash
npm run check
npm test
npm run build
npm run test:e2e
```

Playwright covers desktop and mobile Chromium against the production build.
Service workers require HTTPS or `localhost` and are disabled during development.

Regenerate the iOS launch images after changing the brand mark or the paper
colour:

```bash
node scripts/build-ios-splash.mjs
```

## Tech

- Svelte 5 + TypeScript + Vite
- Typed, validated localStorage persistence
- FSRS-4.5-style adaptive scheduler (`src/lib/fsrs.ts`)
- Vitest unit tests and Playwright end-to-end tests
- Fully offline PWA: the whole build is precached on first visit

## Layout

```
src/App.svelte       — guarded hash routes and application shell
src/lib/components/  — Svelte screens and shared UI
src/lib/store.ts     — typed persistence, validation, import/export
src/lib/fsrs.ts      — spaced-repetition scheduler
src/lib/review.ts    — review queue and rating transitions
src/lib/data.ts      — typed corpus access helpers
src/lib/offline.ts   — worker registration, connectivity, update prompt
src/sw/              — offline worker source, before the manifest is injected
src/styles/base.css  — the design system every screen builds on
src/data/frequency/  — generated top-1,000 lists and Polish forms, per language
src/data/content/    — generated glosses, examples, and translations
src/data/corpus.test.ts — the validation boundary for everything in src/data/
scripts/             — corpus builders, launch-image builder, Vite plugins
tests/e2e/           — Playwright user journeys
public/              — manifest, icons, and iOS launch images
```

Everything under `src/data/` is generated — see `src/data/PROVENANCE.md` for
sources and licences, and regenerate rather than editing by hand.

## Editing translations and examples

Learning text is kept separate from the generated frequency corpus. Every
content file contains all 1,000 frequency entries, keyed by rank. Contexts are
selected independently for each home language so the displayed example always
has a direct corpus translation where one is available. Entries that Tatoeba
does not cover retain a source-language example but deliberately leave the
missing translation blank for later human curation; automatic sentence
translations are not generated. Optional grammar `note` fields explain forms
whose meaning changes in context.

## Offline

Dobze runs with the network switched off — not just the shell, but every
screen, all eight corpora, and the example sentences.

`scripts/vite-plugin-offline.ts` reads the finished build and writes
`service-worker.js` with the complete list of shipped files baked in, so
`install` stores everything in one go. Because the list is generated, a chunk
added later cannot be forgotten. Assets are content-hashed, so each build gets
its own cache; activating a new worker deletes the previous one.

Once the worker controls the page the app reports **Offline install · Ready**
in settings. From then on launches are served from the cache whether or not
there is a connection, and a new deploy surfaces a "reload when you like"
prompt rather than swapping the app out mid-review.

## On iPhone

1. Open the production build in Safari over HTTPS.
2. Tap the share icon → **Add to Home Screen**.
3. The app launches standalone and full screen.

The layout is built around the iPhone's safe areas. The web view runs edge to
edge under the Dynamic Island, with a frosted strip the exact height of the
top inset so scrolled text never passes behind the clock; the tab bar, rating
row, and word sheet all sit clear of the home indicator; and every tap target
in the chrome is finger-sized even where the label is small. Landscape
respects the side inset the island takes when the phone is turned.

`scripts/build-ios-splash.mjs` generates the launch images that stop iOS from
flashing white between the home-screen tap and first paint, covering the
Dynamic Island models through to the first SE.
