---
name: frontend
description: Guide implementation work in the MusicVoting Angular frontend (musicvoting/frontend/). Use when adding pages, components, services, or routes; when wiring API calls or SSE; or when working with the queue, voting, search, or auth UI.
---

# MusicVoting — Frontend Development Guide

## Stack at a glance

| Component | Detail |
|---|---|
| Framework | Angular 22 — **all components standalone** (no NgModules); exact version in `package.json` |
| Change detection | `provideZonelessChangeDetection()`; some older components still call `cdr.detectChanges()` |
| Reactivity | Signals (`signal`, `computed`) — use them for new state |
| HTTP | `HttpClient` + `hostAuthInterceptor` (adds `Authorization: Bearer <hostPin>`) |
| Dev proxy | `/api/*` → `http://localhost:8080` (`proxy.conf.json`, dev only) |
| SSR | `@angular/ssr` — guard browser globals with `isPlatformBrowser()` |
| Styles | Plain CSS per component + design tokens (see `DESIGN.md`, `shared/stage.css`) |
| UI language | German throughout |

---

## Directory map

```
src/app/
├── app.routes.ts            All client routes (+ guards)
├── app.config.ts            Providers (zoneless CD, router, hydration)
├── ../main.ts               Bootstrap — registers HttpClient + hostAuthInterceptor
├── host.guard.ts            Host routes: requires `mv_party_host_pin` in localStorage
├── guest.guard.ts           Guest routes: requires a joined party
├── host-auth.interceptor.ts Adds the host PIN as Bearer token to every request
├── services/
│   ├── party.service.ts     Party lifecycle, pins, deviceId, default playlist, blacklist (typed interfaces)
│   ├── spotify-player.ts    Web Playback SDK, queue, add, vote, play, SSE queue updates
│   ├── spotify-tracks.ts    Track search (`TrackService`)
│   └── queue-state.ts       Shared queue state (which URIs are already queued)
├── shared/                  Reusable UI: mv-cover, mv-icon, mv-spinner, mv-toast (+ toast.service),
│                            mv-host-menu, mv-guest-tabs, mv-guest-party, mv-party-ended,
│                            mv-credit-footer, mv-theme-toggle (+ theme.service), stage.css
└── pages/
    ├── home/                Landing: host or guest
    ├── code-input/          Guest joins with 5-digit code (also `join/:pin`)
    ├── host-options/        Host: create a party or enter host PIN
    ├── create-party/        Host: Spotify login + party creation
    ├── select-playlist/     Host setup: default playlist (auto-refill source)
    ├── select-blacklist/    Host setup: blacklist words / artists / songs
    ├── party-ready/         Host setup: open the player, go live
    ├── startpage/           TV/player view: current track, queue, Web Playback SDK
    ├── host-dashboard/      Host: playback controls + queue management
    ├── search-host/         Host: search + add
    ├── voting-host/         Host: see votes
    ├── guest/               Guest: search + add
    └── voting-comp/         Guest: vote on queued songs
```

The routes and their guards are in `app.routes.ts` — read it instead of duplicating it here.

---

## Party identity (localStorage)

| Key | Meaning |
|---|---|
| `mv_party_id` | Current party ID (all API paths are `/api/party/{id}/…`) |
| `mv_party_pin` | Guest join code |
| `mv_party_host_pin` | Host PIN — sent as Bearer token, unlocks host routes |
| `mv_device_id` | Persistent guest device UUID (also a 1-year cookie) — used for votes |

`PartyService.clearParty()` removes the party keys when a party ends.

---

## SSE

Pages open `new EventSource('/api/spotify/events?source=web&partyId=<id>')` and switch on `type`:
`login-success`, `track-changed`, `queue-updated`, `vote-updated`, `progress`, `blacklist-updated`, `party-ended`.

Always close the EventSource in `ngOnDestroy`. On `party-ended`, show `mv-party-ended` instead of redirecting.

---

## Spotify Web Playback SDK

Runs only on `/startpage` (otherwise it would steal the active device). It loads the SDK, gets the token from
`/api/party/{id}/spotify/token` (refreshed via `provideOAuthToken`), and registers the device via
`PUT /api/party/{id}/spotify/deviceId`. Other pages read playback state from `GET /api/party/{id}/track/current`.

---

## Adding a new page

1. Create `src/app/pages/<name>/<name>.ts` (+ `.html`, `.css`, `.spec.ts`) as a standalone component; use `inject()`.
2. Add the route to `app.routes.ts` with a German `title` and the right guard (`hostGuard` / `guestGuard`).
3. Reuse `shared/` components (cover, icon, spinner, toast) instead of hand-written markup.
4. Show errors to the user via `ToastService.error(...)` — never only `console.error`.

---

## Pitfalls

- **SSR and browser globals** — `window`, `localStorage`, `EventSource`, `setInterval` must be guarded with `isPlatformBrowser()`.
- **Many responses are still typed `any`** — add an interface (like those in `party.service.ts`) when you touch one.
- **`@for` tracking** — use a stable key (`track.uri` / `track.id`), not the index.
- **Tests:** `npx ng test --watch=false --browsers=ChromeHeadless`; every test needs an `expect`.

---

## Running locally

```bash
cd musicvoting && docker compose up -d          # PostgreSQL
cd musicvoting/backend && ./mvnw quarkus:dev    # backend on :8080
cd musicvoting/frontend && npm start            # http://localhost:4200, proxies /api
```
