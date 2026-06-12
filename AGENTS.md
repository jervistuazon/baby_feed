# Project Instructions

## Cache Busting

Every app update must bump the app cache-buster version before delivery.

- Keep the `?v=...` values for `style.css` and `script.js` in `index.html` in sync.
- Keep `APP_VERSION` at the top of `script.js` in sync with the same version.
- Increment the version for every code, content, or style update, for example from `2026.06.12.1` to `2026.06.12.2`.

This project is deployed as a static site, so the version bump is required to make online users receive the latest CSS and JavaScript after refresh.
