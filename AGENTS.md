# Anya Baby Tracker

## App Overview

Anya Baby Tracker is a small mobile-first static web app for tracking newborn care throughout a day. It is built with plain HTML, CSS, and vanilla JavaScript, and it stores all data locally in the user's browser with `localStorage`.

The main screen shows one selected day split into 30-minute time slots. Each slot can record:

- Milk feeding, with an optional amount in ml
- Pee
- Poop
- A short note

The app also shows daily summary totals, last feed time, and a suggested next feeding window. It has no backend, account system, database, install step, or build step.

## File Map

- `index.html` contains the app shell, settings menu, summary area, tracker grid mount point, and entry modal markup.
- `style.css` contains the mobile-first visual design, responsive layout, modal styling, settings menu styling, and slot state styling.
- `script.js` contains app state, localStorage persistence, date navigation, grid rendering, summaries, CSV export, JSON backup/import, and feeding-window highlighting.
- `vercel.json` configures the static Vercel deployment.
- `run-localhost.bat` and `serve-localhost.ps1` are local convenience launchers.

## Data Model

Tracker days are stored in `localStorage` using keys like `anya-tracker-2026-06-13`.

Each saved day is an array of 48 slot objects, one for each 30-minute block:

```json
{
  "milk": false,
  "milkAmountMl": null,
  "pee": false,
  "poop": false,
  "notes": ""
}
```

When loading imported or older data, keep using the existing normalization helpers in `script.js` so missing fields and invalid milk amounts are handled consistently.

## User Flows

- Tap a time slot to open the activity modal.
- Select milk, pee, poop, enter an optional milk amount, or add a short note.
- Use Prev, Today, and Next to move between days.
- Use Settings to export the selected day as CSV, back up all saved days as JSON, import a JSON backup, or clear the selected day.

## Implementation Notes

- Prefer small, direct changes. This app intentionally avoids frameworks and dependencies.
- Keep behavior client-only unless the user explicitly asks for backend or sync functionality.
- Preserve the backup JSON shape unless intentionally doing a migration.
- Be careful with `localStorage` keys. Only tracker-day keys should be imported, exported, or cleared by tracker features.
- Test changes by opening `index.html` directly or serving the folder locally; there is no build command.

## Cache Busting

Every app update must bump the app cache-buster version before delivery.

- Keep the `?v=...` values for `style.css` and `script.js` in `index.html` in sync.
- Keep `APP_VERSION` at the top of `script.js` in sync with the same version.
- Increment the version for every code, content, or style update, for example from `2026.06.12.1` to `2026.06.12.2`.

This project is deployed as a static site, so the version bump is required to make online users receive the latest CSS and JavaScript after refresh.
