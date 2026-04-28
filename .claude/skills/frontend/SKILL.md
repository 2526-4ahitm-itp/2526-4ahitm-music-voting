---
name: frontend
description: Guide implementation work in the MusicVoting Angular frontend (musicvoting/frontend/). Use when adding pages, components, services, or routes; when wiring API calls or SSE; or when working with the queue, voting, search, or auth UI.
---

# MusicVoting — Frontend Development Guide

## Stack at a glance

| Component | Detail |
|---|---|
| Framework | Angular 20.3.0 — **all components standalone** (no NgModules) |
| Change detection | `provideZonelessChangeDetection()` enabled; some components still call `cd.detectChanges()` manually |
| Reactivity | Angular Signals (`signal`, `computed`) in newer components; class properties + `ChangeDetectorRef` in older ones |
| HTTP | `HttpClient` via `provideHttpClient()` (no interceptors) |
| Dev proxy | `/api/*` → `http://localhost:8080` (proxy.conf.json, dev only) |
| SSR | `@angular/ssr` with `RenderMode.Prerender` on all routes |
| Styles | Plain CSS, one file per component — no framework (no Tailwind, no Material) |
| UI language | German throughout |

---

## Directory map

```
src/
├── main.ts                          Bootstrap, providers (HttpClient, Router)
├── app/
│   ├── app.ts                       Root component — just <router-outlet>
│   ├── app.routes.ts                All client routes
│   ├── app.config.ts                App providers (zoneless CD, hydration)
│   ├── app.config.server.ts         SSR providers
│   ├── app.routes.server.ts         Prerender config
│   ├── services/
│   │   ├── spotify-player.ts        Spotify Web Playback SDK + auth + queue helpers
│   │   └── spotify-tracks.ts        Search + startParty (minimal)
│   └── pages/
│       ├── home/                    Landing: pick Host or Guest
│       ├── guest/                   Guest: search Spotify + add songs to queue
│       ├── startpage/               Guest/display: current track + queue + SSE + SDK
│       ├── host-dashboard/          Host: playback controls + queue management
│       ├── voting-comp/             Guest: vote on queued songs (signals-based)
│       ├── voting-host/             Host: see votes (signals-based, same pattern)
│       ├── search-host/             Host: search + add songs (with menu)
│       ├── control/                 UNUSED — legacy stub
│       └── host/                    UNUSED — legacy prototype (bad route ref)
```

---

## Route map

| Path | Component | Who |
|---|---|---|
| `/` | Home | Everyone |
| `/guest` | Guest | Guest: search + add |
| `/startpage` | Startpage | Guest/TV: player view |
| `/dashboard` | HostDashboard | Host: full control |
| `/voting-host` | VotingHost | Host: view votes |
| `/voting` | VotingComp | Guest: vote |
| `/search-host` | SearchHost | Host: search + add |
| `**` | (redirect → `/`) | — |

No route guards — auth is purely backend-driven (Spotify OAuth redirect).

---

## Services

### `SpotifyWebPlayerService` (`services/spotify-player.ts`)
`providedIn: 'root'` singleton.

| Method | What it does |
|---|---|
| `initPlayer(registerPlaybackDevice)` | Loads Spotify SDK, gets token from `/api/spotify/token`, creates `window.Spotify.Player`. If `registerPlaybackDevice=true`, PUTs device_id to `/api/spotify/deviceId`. |
| `getPlayerStatus()` | Returns `Observable<any>` of Spotify SDK `player_state_changed` events. |
| `login()` | Redirects to `/api/spotify/login?source=web`. |
| `addToPlaylist(uri)` | POST `/api/track/addToPlaylist` with `[uri]`. |
| `getQueue()` | GET `/api/track/queue`. |
| `playTrack(uri)` | PUT `/api/track/play` with `{uri}`. |

**SDK only initializes when the route contains `/startpage`** — prevents stealing the active playback device on other pages.

### `TrackService` (`services/spotify-tracks.ts`)
`providedIn: 'root'` singleton, minimal.

| Method | What it does |
|---|---|
| `searchTracks(query)` | GET `/api/track/search?q=<query>` |
| `startParty()` | POST `/api/track/next` |

---

## All API calls made by the frontend

| Endpoint | Method | Used in |
|---|---|---|
| `/api/spotify/token` | GET | Home, SpotifyWebPlayerService |
| `/api/spotify/deviceId` | PUT | SpotifyWebPlayerService |
| `/api/spotify/events?source=web` | GET (SSE) | Startpage |
| `/api/track/search?q=` | GET | TrackService → Guest, SearchHost |
| `/api/track/queue` | GET | SpotifyWebPlayerService, VotingComp, VotingHost, HostDashboard, Startpage |
| `/api/track/current` | GET | Startpage, HostDashboard |
| `/api/track/addToPlaylist` | POST | SpotifyWebPlayerService |
| `/api/track/start` | POST | HostDashboard |
| `/api/track/next` | POST | HostDashboard, TrackService |
| `/api/track/pause` | POST | HostDashboard |
| `/api/track/resume` | POST | HostDashboard |
| `/api/track/play` | PUT | SpotifyWebPlayerService, HostDashboard |
| `/api/track/remove` | DELETE | HostDashboard |

---

## Implicit data shapes (no TypeScript interfaces exist)

```typescript
// Track (from Spotify API / queue response)
{
  id: string, uri: string, name: string,
  artists: [{ name: string }],
  album: { images: [{ url: string }] },
  duration_ms: number
}

// Queue response
{ queue: Track[] }

// Current playback response
{ track: Track | null, isPlaying: boolean, progressMs: number }

// Spotify SDK player state
{ paused: boolean, position: number,
  track_window: { current_track: Track, previous_tracks: Track[] } }

// SSE message body
{ type: 'login-success' }
```

When adding new API calls, define an interface for the response rather than using `any`.

---

## State management patterns

Two patterns exist — use signals for new work:

**Signals (newer, preferred):**
```typescript
import { signal, computed } from '@angular/core';

tracks = signal<Track[]>([]);
filteredTracks = computed(() =>
  this.tracks().filter(t => t.name.includes(this.searchQuery()))
);
```
Template: `@for (t of filteredTracks(); track t.id) { ... }`

**Class properties + ChangeDetectorRef (legacy, avoid for new code):**
```typescript
constructor(private cd: ChangeDetectorRef) {}
tracks: Track[] = [];
// after async update:
this.cd.detectChanges();
```

---

## Adding a new page

1. Create `src/app/pages/<name>/<name>.ts` (and `.html`, `.css`).
2. Use the standalone component scaffold:
```typescript
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-<name>',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './<name>.html',
  styleUrl: './<name>.css'
})
export class MyPage implements OnInit {
  private http = inject(HttpClient);

  ngOnInit() { /* load data */ }
}
```
3. Add the route to `app.routes.ts`:
```typescript
{ path: 'my-path', component: MyPage, title: 'Titel - MusicVoting' }
```
4. Add to `app.routes.server.ts` if prerendering is needed (default: all routes prerender).

---

## Making HTTP calls

Inject `HttpClient` directly in components, or delegate to a service for reuse:

```typescript
private http = inject(HttpClient);

// As Promise (preferred for one-shot async calls)
const res: any = await lastValueFrom(this.http.get('/api/track/queue'));

// As Observable (preferred when you need streaming/cancellation)
this.http.get('/api/track/queue').subscribe({
  next: (res: any) => { this.tracks = res.queue; },
  error: (err) => console.error('Fehler:', err)
});
```

Always handle errors — show a user-visible message, don't only log to console.

---

## SSE (Server-Sent Events)

Used in `Startpage` to listen for login events:

```typescript
private eventSource?: EventSource;

ngOnInit() {
  this.eventSource = new EventSource('/api/spotify/events?source=web');
  this.eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'login-success') { window.location.reload(); }
    } catch { /* malformed JSON, ignore */ }
  };
}

ngOnDestroy() {
  this.eventSource?.close();
}
```

Always close the EventSource in `ngOnDestroy` to prevent connection leaks.

---

## Polling pattern

HostDashboard and Startpage poll the backend. Standard approach:

```typescript
private pollId?: ReturnType<typeof setInterval>;

ngOnInit() {
  this.load();
  this.pollId = setInterval(() => this.load(), 10_000);
}

ngOnDestroy() {
  clearInterval(this.pollId);
}
```

Polling intervals in use: **5 s** for current playback, **10 s** for queue.

---

## Spotify Web Playback SDK

The SDK runs only on `/startpage`. It:
1. Dynamically loads `https://sdk.scdn.co/spotify-player.js`.
2. Fetches the token from `/api/spotify/token` (plain text).
3. Creates `new Spotify.Player({ name, getOAuthToken })`.
4. On `ready` event → registers device ID via PUT `/api/spotify/deviceId`.
5. On `player_state_changed` → emits via `playerStateSubject` observable.

For any page that needs current playback state **without** the SDK (e.g. HostDashboard), poll `GET /api/track/current` instead.

---

## Auth flow (frontend perspective)

```
Home.gotohostpage()
  → fetch('/api/spotify/token')
      OK → navigate('/dashboard')
      fail → window.location = '/api/spotify/login?source=web'
             (backend handles OAuth, redirects back to /dashboard)
```

Login completion is also broadcast via SSE (`type: login-success`). Startpage reloads itself on receipt.

There is no token stored in `localStorage` or `sessionStorage` — always retrieved from the backend.

---

## Known quirks and pitfalls

- **`VotingHost` has the wrong selector** (`app-voting-comp` instead of `app-voting-host`) — copy-paste bug. Fix it when touching that component.
- **No TypeScript interfaces** — everything is typed as `any`. Add interfaces when you touch a component (see shapes above).
- **`control/` and `host/` are unused** — not wired into routes. Do not extend them; create new pages instead.
- **Zoneless CD is enabled** but `cd.detectChanges()` is still called manually in several components. Prefer signals for new state — signals work correctly with zoneless without manual change detection.
- **SSR and `window`/`document`** — any code touching browser globals (`window.Spotify`, `EventSource`, `setInterval`) must be guarded with `isPlatformBrowser()` if it runs server-side:
  ```typescript
  import { isPlatformBrowser } from '@angular/common';
  import { PLATFORM_ID, inject } from '@angular/core';
  private platformId = inject(PLATFORM_ID);
  if (isPlatformBrowser(this.platformId)) { /* browser-only */ }
  ```
- **Voting backend exists** (`POST /api/track/vote`) but **the frontend heart button does nothing** — it is not wired up.
- **No global error handling** — HTTP errors are silently logged. Add user-facing feedback when implementing new features.
- **The `trackBy` key for `@for`** must be `track.id` (not index) to preserve DOM nodes across re-renders.

---

## Running locally

```bash
# Start backend first (required for API proxy)
cd musicvoting && docker compose up -d
cd musicvoting/backend && ./mvnw quarkus:dev

# Run Angular dev server
cd musicvoting/frontend && npm start
# → http://localhost:4200 (proxies /api/* to localhost:8080)
```

Production build:
```bash
cd musicvoting/frontend && npm run build
# Output: dist/spotify-angular-player/{browser,server}
```
