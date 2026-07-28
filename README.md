# Dobze

A local-first frequency trainer for Polish, English, and Dutch. Review is the core workflow: new and difficult words appear frequently, while well-known words are scheduled further apart.

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

## Tech

- Svelte 5 + TypeScript + Vite
- Typed, validated localStorage persistence
- FSRS-4.5-style adaptive scheduler (`src/lib/fsrs.ts`)
- Vitest unit tests and Playwright end-to-end tests
- PWA manifest and same-origin offline cache

## Layout

```
src/App.svelte       — guarded hash routes and application shell
src/lib/components/  — Svelte screens and shared UI
src/lib/store.ts     — typed persistence, validation, import/export
src/lib/fsrs.ts      — spaced-repetition scheduler
src/lib/review.ts    — review queue and rating transitions
src/lib/data.ts      — typed corpus access helpers
js/content/          — generated corpus contexts plus curated fallbacks
js/generated/        — generated top-1,000 data and Polish forms
tests/e2e/           — Playwright user journeys
public/              — PWA worker, manifest, and icons
```

## Editing translations and examples

Learning text is kept separate from the generated frequency corpus. Every
content file contains all 1,000 frequency entries, keyed by rank. Contexts are
selected independently for each home language so the displayed example always
has a direct corpus translation where one is available. Entries that Tatoeba
does not cover retain a source-language example but deliberately leave the
missing translation blank for later human curation; automatic sentence
translations are not generated. Optional grammar `note` fields explain forms
whose meaning changes in context.

## Add to home screen on iPhone

1. Open the production build in Safari over HTTPS.
2. Tap the share icon → **Add to Home Screen**.
3. The app launches standalone, full-screen, with safe-area insets.
