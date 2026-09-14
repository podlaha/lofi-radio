# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Run client (Vite, :5173) + server (Express, :3001) together, both with hot reload
npm run dev:client   # Vite dev server only
npm run dev:server   # Express server only (node --watch)
npm run build        # Vite production build -> dist/
npm start            # Run the production server (serves dist/ + API) - what the Dockerfile CMD runs
```

There is no test suite and no lint script configured.

The Vite dev server proxies `/api/*` to `http://localhost:3001` (see `vite.config.js`), so run both halves via `npm run dev` when working on anything that touches the API.

## Architecture

This is a personal site with an embedded internet-radio player, split into an Express API/backend and a React SPA frontend, built together into one deployable Node process.

**Backend** (`server/`):
- `server/index.js` — single-file Express app: helmet CSP, session-cookie auth (`express-session`, bcrypt), rate limiting (stricter on `/api/auth/login`), all REST routes, and in production also serves the built `dist/` (with a catch-all that falls through to `index.html` for client-side routing, but returns JSON 404 for unmatched `/api/*` paths).
- `server/db.js` — the entire data layer. Uses `sql.js` (SQLite compiled to WASM) rather than a native binding, with the whole DB kept in memory and explicitly serialized to `data/balkonek.db` after every write via a `save()` call — there is no separate migration tool; schema changes are applied as idempotent `ALTER TABLE ... ` calls wrapped in try/catch at module load (see the `stream_urls`/`youtube_url` migrations for the pattern to follow). On first run it seeds an admin user, default radio stations, and default contact fields.
- Auth is cookie/session-based, not JWT. `requireAdmin` middleware gates all `/api/admin/*` routes; there's no non-admin authenticated role currently in use even though the `role` column supports `user` vs `admin`.
- Stations can play either a direct/HLS audio stream (`stream_urls`, an ordered array — the frontend fails over to the next URL on error) or a YouTube video (`youtube_url`); a station has one or the other, not both, and the frontend branches its whole playback path on which is present.

**Frontend** (`src/`), React 18 + Vite + Tailwind, client-side routed with `react-router-dom`:
- `context/RadioContext.jsx` — the audio/YouTube playback engine, provided once near the app root and consumed via `useRadio()`. Owns the `<audio>` element, an `Hls.js` instance for `.m3u8` streams, and a hidden YouTube IFrame Player (injected and driven directly through `window.YT`) for stations with a `youtube_url`. Also owns volume/mute state and playback controls (`play`, `pause`, `togglePlay`, `selectStation`, `setVolumeValue`, `toggleMute`).
  - Volume: the volume state/slider position is linear 0–1, but is passed through a perceptual "audio taper" curve (`toGain`, `Math.pow(position, VOLUME_CURVE)`, currently `VOLUME_CURVE = 2.5`) before being applied as actual gain to the `<audio>` element or the YouTube player, so the slider matches how loudness is perceived (like Spotify/SoundCloud). Any new code path that sets audio/YouTube volume must go through `toGain()`, not use the raw slider value directly.
- `context/AuthContext.jsx` — thin wrapper around the `/api/auth/*` endpoints, exposes `user`/`loading`/`login`/`logout` via `useAuth()`.
- `components/ProtectedRoute.jsx` — route guard reading `useAuth()`; supports an `adminOnly` flag, used to gate `/admin`.
- `App.jsx` — also defines the global keyboard shortcuts (`KeyboardControls`, mounted once) and the persistent bottom `FooterPlayer` bar (station switcher, play/pause, volume), rather than these living in their own files.
- **Duplicate component files**: `components/Navbar.jsx`/`Navbar.tsx` and `components/Footer.jsx`/`Footer.tsx` both exist side by side (leftover from an abandoned TS migration). Only the `.jsx` versions are actually wired up — `App.jsx` imports `Navbar` and Vite's default extension resolution picks `.jsx` over `.tsx`; `Footer` isn't imported anywhere. Same applies to the standalone `src/lib/db.ts`, which is dead code (the real data layer is `server/db.js`). When editing these areas, check what's actually imported before assuming the `.tsx` file is live.

**Deployment**: single-stage Docker image (`node:20-slim`) that runs `npm run build` then `npm start`; the container serves both the API and the static frontend from one Express process on port 3001. `data/` (the sqlite file) should be a persisted volume.
