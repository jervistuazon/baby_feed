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
