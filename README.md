# Dobze

A local-first frequency trainer for Polish, English, and Dutch. Review is the core workflow: new and difficult words appear frequently, while well-known words are scheduled further apart.

## Word data

The app ships with the actual 1,000 most frequent subtitle tokens for each language, extracted from the [FrequencyWords OpenSubtitles 2018 corpora](https://github.com/hermitdave/FrequencyWords) (CC BY-SA 4.0). Polish dictionary forms and transformations are generated offline with [Morfeusz 2](https://morfeusz.sgjp.pl/); no user data or progress leaves the device.

Regenerate the checked-in offline corpus with:

```bash
python3 -m pip install morfeusz2
python3 scripts/build-frequency-data.py
```

## Run locally

Any static server works. From the repo root:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Service workers require HTTPS or `localhost`. Plain file:// won't register the worker.

## Tech

- Vanilla HTML/CSS/JS (ES modules), no build step
- localStorage persistence
- FSRS-4.5-style adaptive scheduler (`js/fsrs.js`)
- PWA: manifest + service worker, offline-first

## Layout

```
index.html
manifest.webmanifest
service-worker.js
css/styles.css
js/main.js          — router + mount
js/router.js        — hash router
js/store.js         — persistent state
js/fsrs.js          — spaced-repetition scheduler
js/data.js          — corpus access helpers
js/generated/       — generated top-1,000 PL/EN/NL data + Polish forms
js/ui.js            — DOM helpers
js/screens/         — one file per screen
icons/              — PWA icons
```

## Add to home screen on iPhone

1. Open the deployed site in Safari (must be Safari for PWA install on iOS).
2. Tap the share icon → **Add to Home Screen**.
3. The app launches standalone, full-screen, with safe-area insets.
