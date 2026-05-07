# Dobze

A pocket dictionary you fill with your own ink. Bilingual PL ↔ NL frequency trainer, mobile-first PWA.

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
- FSRS-4.5-style scheduler (`js/fsrs.js`)
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
js/data.js          — top-100 PL/NL corpus + inflected forms
js/ui.js            — DOM helpers
js/screens/         — one file per screen
icons/              — PWA icons
```

## Add to home screen on iPhone

1. Open the deployed site in Safari (must be Safari for PWA install on iOS).
2. Tap the share icon → **Add to Home Screen**.
3. The app launches standalone, full-screen, with safe-area insets.
