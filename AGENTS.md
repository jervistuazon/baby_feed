# Anya Baby Tracker

## App Overview

Anya Baby Tracker is a small mobile-first static web app for tracking newborn care throughout a day. It is built with plain HTML, CSS, and vanilla JavaScript, and it currently stores all data locally in the user's browser with `localStorage`.

The main screen shows one selected day as a chronological timeline of entries. Each entry has a specific time and can record:

- Milk feeding, with an optional amount in ml
- Pee
- Poop
- A short note

The app also shows daily summary totals, last feed time, and a suggested next feeding window. It has no backend, account system, database, install step, or build step unless backend or sync functionality is explicitly requested.

## File Map

- `index.html` contains the app shell, settings menu, summary area, timeline mount point, floating add-entry button, and entry modal markup.
- `style.css` contains the mobile-first visual design, responsive layout, modal styling, settings menu styling, timeline styling, and entry state styling.
- `script.js` contains app state, the tracker storage adapter, localStorage persistence, date navigation, timeline rendering, summaries, CSV export, JSON backup/import, legacy slot migration, and feeding-window calculations.
- `vercel.json` configures the static Vercel deployment.
- `run-localhost.bat` and `serve-localhost.ps1` are local convenience launchers.

## Data Model

Tracker days are stored in `localStorage` using keys like `anya-tracker-2026-06-13`.

Each current saved day is an array of entry objects:

```json
{
  "id": "entry-lx000000-abc123",
  "timeMinutes": 510,
  "milk": false,
  "milkAmountMl": null,
  "pee": false,
  "poop": false,
  "notes": ""
}
```

Entries are normalized, filtered to meaningful content, and sorted by `timeMinutes` and `id` before saving. The app still supports older 48-slot backup data: `normalizeLoadedDay()` detects legacy slot arrays and converts non-empty slots into entries with IDs like `slot-00`.

When loading imported or older data, keep using the existing normalization helpers in `script.js` so missing fields, duplicate IDs, invalid times, invalid milk amounts, and legacy slot arrays are handled consistently.

## User Flows

- Tap Add entry to create a new timed entry, or tap an existing timeline entry to edit it.
- Select milk, pee, poop, set the entry time, enter an optional milk amount, or add a short note.
- Use Prev, Today, and Next to move between days.
- Use Settings to export the selected day as CSV, back up all saved days as JSON, import a JSON backup, or clear the selected day.

## Implementation Notes

- Prefer small, direct changes. This app intentionally avoids frameworks and dependencies.
- Keep behavior client-only unless the user explicitly asks for backend or sync functionality.
- Route persistence through the tracker storage adapter in `script.js` instead of adding new direct `localStorage` calls from UI flow code.
- Preserve the backup JSON shape unless intentionally doing a migration: an object whose keys are tracker-day localStorage keys and whose values are normalized day-entry arrays.
- Be careful with `localStorage` keys. Only tracker-day keys should be imported, exported, or cleared by tracker features.
- If backend sync is added, prefer treating cloud data as the source of truth after sign-in while preserving local import/export as migration and backup tools.
- For any additional visual update or icon work, maintain the existing design language and theme: soft mobile-first baby-care UI, rounded compact controls, stroked inline SVG icons, and the established pink, lavender, teal, amber, and green status palette.
- Test changes by opening `index.html` directly or serving the folder locally; there is no build command.

## Cache Busting

Every app update must bump the app cache-buster version before delivery.

- Keep the `?v=...` values for `style.css` and `script.js` in `index.html` in sync.
- Keep `APP_VERSION` at the top of `script.js` in sync with the same version.
- Increment the version for every code, content, or style update, for example from `2026.06.12.1` to `2026.06.12.2`.

This project is deployed as a static site, so the version bump is required to make online users receive the latest CSS and JavaScript after refresh.
