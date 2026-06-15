# Anya Baby Tracker

A simple mobile-first newborn care tracker built with plain HTML, CSS, and vanilla JavaScript. It stores feeding, pee, poop, and notes locally by default, and can use Firebase Authentication plus Cloud Firestore for signed-in cross-device sync.

## Files

- `index.html` - app shell, settings menu, timeline, and entry modal
- `style.css` - mobile-first baby-friendly styling
- `script.js` - tracker state, local storage, Firebase sync, summaries, exports, and imports
- `firebase-config.js` - Firebase web app config for the live Firebase project
- `firestore.rules` - Cloud Firestore rules for signed-in family data
- `firebase.json` - Firebase CLI config for rules and optional static hosting
- `vercel.json` - Vercel static-site configuration

## Run locally

No install step is required. Open `index.html` directly in a browser, or serve the folder locally.

On Windows, double-click `run-localhost.bat` to start a local server and open the app at <http://localhost:4173>.

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Firebase setup

The app is configured for the Firebase project `baby-tracker-e5753`. Google sign-in is enabled, Cloud Firestore is created, and the Firestore rules in this repo have been deployed.

If you replace the Firebase project later, use this checklist:

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Create or select a Firebase project.
3. Add a Web app in Project overview.
4. Copy the `firebaseConfig` values into `window.ANYA_FIREBASE_CONFIG` in `firebase-config.js`.
5. In Authentication, enable the Google sign-in provider.
6. In Authentication settings, add your deployed Vercel domain and `localhost` as authorized domains if they are not already listed.
7. In Firestore Database, create a database.
8. Publish `firestore.rules` in the Firestore Rules tab, or deploy them with the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

After the config is filled in, Settings shows **Sign in with Google**. Once signed in, Firestore is treated as the source of truth. If the browser already has local tracker days and the cloud family is empty, the app asks whether to copy the local entries into cloud sync.

### Family data

Cloud data is stored under:

```text
families/{familyId}/days/{YYYY-MM-DD}/entries/{entryId}
```

The default `familyId` is `anya-family`. You can change it in `firebase-config.js` if you want a different shared family bucket.

Shared family access is controlled by private Firestore invite records under `families/{familyId}/invites`. The invited owner should sign in first to create the family cloud space, then caregiver accounts can sign in and join the same synced data.

## Cache busting

Every app update must bump the cache-buster version in `index.html` and `script.js`.

- Update the `?v=...` value on the `style.css`, `firebase-config.js`, and `script.js` asset URLs in `index.html`.
- Update `APP_VERSION` at the top of `script.js` to the same value.
- Use an incrementing value such as `2026.06.15.8` for the next update.

This keeps deployed browsers from reusing old cached CSS or JavaScript after a new release.

## Deploy directly to Vercel

This project is configured for Vercel as a static site. There is no build command and no output folder to generate.

### Vercel Dashboard

1. Push this folder to a GitHub, GitLab, or Bitbucket repository.
2. In Vercel, choose **Add New > Project** and import the repository.
3. Use these project settings:
   - **Framework Preset:** Other
   - **Root Directory:** `.` unless this app is inside a subfolder
   - **Build Command:** leave empty
   - **Output Directory:** `.`
   - **Install Command:** leave empty or default
4. Click **Deploy**.

### Vercel CLI

From the project root:

```bash
npx vercel
```

Follow the prompts to link or create a Vercel project. For production after the preview looks good:

```bash
npx vercel --prod
```

## Data and privacy notes

- Local tracker data stays in the current browser profile using keys like `anya-tracker-2026-06-12`.
- Signed-in tracker data is stored in your Firebase project's Cloud Firestore.
- Firebase web config values are public project identifiers, not database permissions. Firestore access is controlled by `firestore.rules`.
- The **Backup JSON** button downloads saved tracker days from the active store, local or cloud.
