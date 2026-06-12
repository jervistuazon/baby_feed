# Anya Baby Tracker

A simple mobile-first newborn care tracker built with plain HTML, CSS, and vanilla JavaScript. It stores feeding, pee, poop, notes, dark mode preference, and daily exports entirely in the browser with `localStorage`.

## Files

- `index.html` — app shell and controls
- `style.css` — mobile-first baby-friendly styling and dark mode
- `script.js` — localStorage persistence, summaries, exports, and feeding-gap warnings
- `vercel.json` — Vercel static-site configuration

## Run locally

No install step is required. Open `index.html` directly in a browser, or serve the folder locally:

On Windows, double-click `run-localhost.bat` to start a local server and open the app at <http://localhost:4173>.

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Cache busting

Every app update must bump the cache-buster version in `index.html` and `script.js`.

- Update the `?v=...` value on the `style.css` and `script.js` asset URLs in `index.html`.
- Update `APP_VERSION` at the top of `script.js` to the same value.
- Use an incrementing value such as `2026.06.12.2` for the next update.

This keeps deployed browsers from reusing old cached CSS or JavaScript after a new release.

## Deploy directly to Vercel

This project is already configured for Vercel as a static site. There is no build command and no output folder to generate.

### Option 1: Vercel Dashboard

1. Push this folder to a GitHub, GitLab, or Bitbucket repository.
2. In Vercel, choose **Add New > Project** and import the repository.
3. Use these project settings:
   - **Framework Preset:** Other
   - **Root Directory:** `.` unless this app is inside a subfolder
   - **Build Command:** leave empty
   - **Output Directory:** `.`
   - **Install Command:** leave empty / default is fine because there is no `package.json`
4. Click **Deploy**.

### Option 2: Vercel CLI

From the project root:

```bash
npx vercel
```

Follow the prompts to link or create a Vercel project. For production after the preview looks good:

```bash
npx vercel --prod
```

## Data and privacy notes

- All tracker data stays in the current browser profile using keys like `anya-tracker-2026-06-12`.
- There is no backend, account, database, or cross-device sync.
- The **Backup JSON** button downloads all saved tracker days from this browser so they can be stored elsewhere.
