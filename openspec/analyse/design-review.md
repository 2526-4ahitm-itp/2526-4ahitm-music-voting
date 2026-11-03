# Design Review — MusicVoting

_Reviewed 2026-11-03 on branch `docs/design` (state of `main` at `b0d49f01`)._
_Basis: all specs in `openspec/specs/`, backend (`musicvoting/backend`), Angular frontend (`musicvoting/frontend`), screenshots in `hugo/content/status/screens/`._

## TL;DR

**The overall design fits the use case well.** For a party app where guests join anonymously and one shared screen plays the music, the main choices are right:
anonymous QR join, one host secret, a DB-backed queue as the source of truth, server-side ordering, and SSE (server-sent events) for live updates.

**It is not optimal yet.** The weak points are in three areas:

1. **Security of the host role.** Some endpoints that should be host-only are open, and a guest can read the host's Spotify token today. The 5-digit host PIN can be brute-forced.
2. **Spec vs. code drift.** Some spec requirements (rate limit, optimistic voting, toggling likes, like count on the TV, reconnect + reload) are missing or behave differently in the code.
3. **The provider abstraction and the frontend structure** will make YouTube support and UI consistency more expensive than they need to be.

Verdict per area:

| Area | Verdict |
|---|---|
| Overall architecture (Angular + Quarkus + Postgres + SSE) | ✅ Good fit |
| Roles & join flow (guest / host / TV) | ✅ Good fit |
| Queue & voting data model | ✅ Good, small improvements possible |
| Real-time (SSE) | 🟡 Right choice, implementation can be leaner |
| Host authentication / authorization | 🔴 Not adequate yet |
| Provider abstraction (Spotify / YouTube) | 🟡 Leaky, blocks YouTube |
| Frontend structure & visual design | 🟡 Good look, inconsistent foundation |
| TV dashboard UX | 🟡 Not optimised for viewing from a distance |
| Guest voting UX | 🔴 Liked songs get locked (contradicts spec) |

---

## 1. What the app has to do (from the specs)

- **Guests:** scan a QR code (or type a 5-digit PIN), no login. They search songs, add them (max 10/min) and like/unlike them. They must not see who added what.
- **Host:** creates the party, logs in with Spotify (Premium) or YouTube once, picks a fallback playlist and a blacklist. They control playback from their phone and can remove/block songs and end the party.
- **TV / dashboard:** a passive screen that plays audio (Spotify Web Playback SDK) and shows the QR code, current song, progress bar and sorted queue.
- **Scale:** one room, roughly 10–100 phones, one party lasting a few hours (auto-ends after 2 days).

That is a **small, real-time, low-trust** system: guests are anonymous and could be anyone in the room or anyone who got the link. Every design choice below is judged against that.

---

## 2. What is well designed ✅

| Choice | Why it fits |
|---|---|
| **Anonymous guests + `deviceId`** (localStorage + 1-year cookie) | No friction at a party. The `UNIQUE (queue_entry_id, device_id)` constraint makes double-taps safe. The cookie backup is a nice touch. |
| **QR → `/join/:pin`, plus typed PIN** | One mechanism covers both cases. The PIN shows up on screen when the QR can't be scanned. |
| **DB is the single source of truth for the queue**; sorting happens at read time (`likes DESC, added_at ASC`) | Survives backend restarts. No sync problems with a Spotify playlist. Fair FIFO tie-break. |
| **Separate in-memory `Party` / `PartyRegistry` vs. `PartyEntity`, with DB fallback** | Fast hot path, and parties are rebuilt after a restart. The refresh token is persisted so the host stays logged in. |
| **SSE instead of WebSockets** | Traffic is almost entirely server→client. SSE is simpler, works through proxies and reconnects automatically in the browser. |
| **Every API path is party-scoped** (`/api/party/{id}/…`) | Supports several parties at once. Clean URLs and a clean 404 when a party has ended. |
| **TV has no controls** | Correct: the screen is public, the controls stay on the host's phone. |
| **Blacklist as words / artist IDs / track URIs**, whole-word and case-insensitive matching | Matching by ID avoids blocking namesakes and still catches features. Whole-word matching avoids false positives like "Oliver". Enforcing it on the server for every client (and for auto-refill) is right. |
| **Refill chain** (default playlist → similar → Top-Charts → search) | Handles Spotify's deprecated recommendation endpoints in a robust way, so the music never stops. |
| **Party lifecycle** (auto-end after 2 days, purge after 1 month, no play history) | Data minimisation is good for a school project that handles guests' phones. |
| **Partial unique index on active PINs** (`WHERE ended_at IS NULL`) | Elegant: PINs get reused safely. |
| **OpenSpec workflow** | Specs are detailed and scenario-based. This review was only possible because of them. |

---

## 3. Problems, ordered by severity

### 🔴 3.1 A guest can read the host's Spotify access token

`GET /api/party/{partyId}/spotify/token` has **no `@HostOnly`** (`backend/.../endpoints/SpotifyTokenResource.java:53`). Every guest knows the party ID, because the guest app uses it for all calls. So any guest can fetch the host's token and then:
- control the host's Spotify account with the requested scopes (`user-modify-playback-state`, `playlist-modify-private`, `playlist-read-private`, `user-read-email`, …)
- read the host's private playlists and e-mail address.

The TV player needs the token, but the TV is a *host* device.

**Fix:** mark `/token` as `@HostOnly` (the TV already runs with the host PIN in localStorage). Better still, give the TV its own short-lived "player token" so the host PIN never has to sit on a public screen.

### 🔴 3.2 Other host-only actions are open

| Endpoint | Problem |
|---|---|
| `PUT /spotify/deviceId` (`SpotifyTokenResource.java:109`) | A guest can move playback to a different device, which hijacks the audio. |
| `POST /track/progress` (`TrackResource.java:144`) | A guest can broadcast fake progress to every client. |
| `POST /track/addToPlaylist` (`TrackResource.java:94`) | Takes a **list** of URIs and has no rate limit, so one request can flood the queue (see 3.4). |

**Rule of thumb:** anything that is not search, read queue, add one song or vote should be `@HostOnly`.

### 🔴 3.3 A 5-digit host PIN is not enough as the only host secret

- `GET /api/party/host-join/{hostPin}` (`PartyResource.java:130`) maps a host PIN to a party with no throttling. There are only 100,000 possible PINs, so a script can try them all in minutes and **become host of every active party**.
- `HostAuthFilter` has no lockout either.
- The host PIN also travels as a bearer token on *every* request (`host-auth.interceptor.ts`) and sits on the TV's localStorage.

**Fix (low effort, big gain):**
1. After party creation, issue a **long random host token** (for example a 128-bit UUID) and use that as the bearer. Keep the 5-digit host PIN only as a "log in on a second device" code.
2. Rate-limit `/host-join` and failed `401/403` responses per IP (Quarkus has `quarkus-rate-limiter`, or use a simple in-memory bucket).

### 🔴 3.4 Spec'd features missing or contradicted in code

| Spec | Code |
|---|---|
| `guest/spec.md` — **max 10 adds per minute**, message "Zu viele Anfragen — bitte kurz warten." | There is no rate limit anywhere in the backend (the only `429` handling is for Spotify's own limits). |
| `voting/spec.md` — **likes are togglable** | `voting-comp.css:235` sets `.track-card.voted { pointer-events: none; opacity: .5; filter: grayscale(1) }`. After liking, the card cannot be clicked, so **un-liking is impossible**, and the liked card looks *disabled*. |
| `voting/spec.md` — **optimistic vote UI** with revert on error | `voting-comp.ts:74` waits for the server before it updates the UI. |
| `dashboard/spec.md` — TV queue shows **like count per entry** | The TV startpage queue shows no like counts (see screenshot `startpage.png`). |
| `party/spec.md` — clients **reconnect and reload state** | Five pages each create their own `EventSource` with no `onerror` / reload logic. The browser reconnects, but no state is reloaded, so events missed during the gap are lost. |
| `party/spec.md` — YouTube provider | `MusicProviderFactory` throws `UnsupportedOperationException`. That is fine if it's planned, but the spec currently reads as if it's done. |

Per `ARBEITSREGELN.md` §2, these should be fixed or the specs adjusted via an OpenSpec change.

### 🟡 3.5 Visual confusion: "liked", "blocked" and "disabled" look the same

- Liked songs (`.voted`): opacity 0.5 and grayscale
- Blacklisted songs (`.blocked` in `guest.css:355`): opacity 0.5
- Disabled "Weiter" button: greyed out

A guest who likes a song sees it **fade out like a blocked song**, which reads as "something went wrong". A like is positive feedback. It should look *more* prominent (filled heart in the accent colour, maybe a subtle tint), not faded. Keep greying out only for "not available".

### 🟡 3.6 The provider abstraction leaks and mixes responsibilities

`MusicProvider` (`provider/MusicProvider.java`):
- returns JAX-RS `Response` objects, so HTTP concerns live inside the provider
- contains **`toggleVote`, `getQueue`, `getQueueForDevice`, `removeTrack`**. Votes and the queue are *your* domain logic in Postgres, not provider logic. A YouTube provider would have to re-implement voting.
- still has playlist-era methods (`overwritePlaylist`, `addTracksToPlaylist`) although the spec says the Spotify playlist is no longer the queue.

`SpotifyMusicProvider` is **1,840 lines**: it combines the HTTP client, token refresh, queue logic, refill strategy and playback.

**Better split:**

```
QueueService     (DB: add, remove, sort, votes, blacklist check, rate limit)   ← provider-independent
PlaybackService  (start/next/pause, refill orchestration)                       ← provider-independent
MusicProvider    (search, getTrack, play(uri), pause, resume, listPlaylists,
                  playlistTracks, similarTracks)  → returns domain objects, not Response
SpotifyClient    (raw HTTP + token refresh)
```

After this split, YouTube only has to implement about 8 small methods.

### 🟡 3.7 SSE design: one global bus, filtering per connection

- `LoginEventBus` (the name dates from when it only carried login events) sends **every event of every party** to every connection, and each connection filters with a long boolean expression (`SpotifyCallbackResource.java:215`). This is fine for 1–5 parties, but it is O(parties × clients).
- If `source` is neither `web` nor `ios`, the endpoint returns the **unfiltered stream of all parties** (`return stream;`), which is a small information leak.
- Every `vote-updated` makes *every* client re-fetch the full queue. With 80 phones and a burst of likes, that is a lot of identical `GET /queue` requests.
- `progress` is broadcast every second to all guests, although only the host and TV show it.

**Better:** keep one emitter list per party (`Map<PartyId, List<Emitter>>`), rename the bus to `PartyEventBus`, and send the **new queue snapshot in the `queue-updated`/`vote-updated` payload**. Clients then don't have to re-fetch, and debouncing (for example 200 ms) collapses bursts of votes.

### 🟡 3.8 Frontend foundation

- `styles.css` is 9 lines, and each page has its own CSS (4,200 lines in total). The same purple is spelled `#8403A6`, `#8b00a5`, `#6a0089` and `#C826B8`, and there are three error reds. → Introduce **CSS custom properties** (`--color-primary`, `--color-accent`, `--radius-card`, `--shadow-card`, `--space-*`) and shared component classes (`.card`, `.btn-primary`, `.track-row`).
- The track row is implemented separately in voting, guest search, host voting, host search, the TV queue and the blacklist page. → One `<app-track-row>` component with inputs (`showLikes`, `action`, `blocked`).
- SSE setup is copy-pasted into 5 pages. → One `PartyEventsService` exposing an RxJS `Observable` with reconnect + reload. This also fixes 3.4.
- **Angular SSR is enabled** (`@angular/ssr`, `express`) but the app relies on `localStorage`, `EventSource` and the Spotify SDK, which are all browser-only. SSR adds complexity and no benefit for a QR-opened single-page app. → Consider removing it.
- `queue` items are typed as `any` in several places. → A shared `QueueEntry` interface catches spec drift at compile time.

### 🟡 3.9 TV dashboard UX (`startpage.png`)

The TV is viewed from **2–5 m away**, and the current layout is designed like a desktop page:
- Queue titles are about 14–15 px (`startpage.css:145/149`) and are unreadable from the couch.
- The QR code is about 150 px. Phones need a larger code to scan from a distance.
- Like counts are missing (spec violation, see 3.4), and they are the most interesting live information on a voting screen.
- Rank numbers are drawn **on top of album art**, so contrast depends on the cover.
- The 3-column grid of small cards spreads out the order. A **single vertical list** (rank, cover, title/artist, ♥ count) reads like a chart and shows reordering much better. Animate position changes (`@angular/animations` or the View Transitions API).
- The crown emoji next to the PIN overflows the card (also on `dashboard.png`).

**Suggestion:** 60/40 split. On the left, a large now-playing card with progress. On the right, a big QR code and PIN on top with the top-8 queue below it in large type. Use `clamp()`/`vw` font sizes so it scales on any TV.

### 🟡 3.10 Host dashboard (`dashboard.png`)

- It shows a **⏮ previous** button, but no spec defines "previous", and the queue deletes played songs, so there is nothing to go back to. Remove it or spec it.
- A burger menu (☰) is still there, while the guest spec removed burger navigation. Make it consistent: either tabs here too, or document why the host differs.
- The spec says the host controls the party "typically from a phone", but the screenshot is a wide desktop layout. Make sure the mobile layout is the primary design.
- "Player öffnen" is the most important first step, but its text is cramped and has a typo ("befor" → "bevor").

### 🟢 3.11 Smaller notes

- `app.public.host=172.20.10.8` is hard-coded in `application.properties`. Use an env var/profile (`%dev`) so a teammate's IP never ends up in builds.
- The refresh token is stored in plaintext in `party.spotify_refresh_token`. That is acceptable for a school project, but mention it in the docs, or encrypt it with a key from the environment.
- `vote` has no index on `device_id`. This is not an issue at party scale.
- The circular reference `party.currently_playing_entry_id` → `queue_entry` works, but an `is_playing` flag on `queue_entry` would be simpler.
- The open question in `CLAUDE.md` (empty queue: stop vs. random Top-Charts) is effectively resolved by the provider spec's refill chain ("always a next song"). Close it so web and iOS specs agree.

---

## 4. Recommended order of work

| # | What | Effort | Why first |
|---|---|---|---|
| 1 | `@HostOnly` on `/token`, `/deviceId`, `/progress`; limit guest add to one song per request | S | Closes the token leak and playback hijack |
| 2 | Rate-limit `/host-join`, 401/403 responses and song adds (10/min) | S–M | Closes PIN brute-force and fulfils the spec |
| 3 | Fix the voted-card CSS (togglable, positive styling) + optimistic vote | S | Core guest interaction is currently broken |
| 4 | `PartyEventsService` (shared SSE, reconnect + reload) | M | Removes duplication and fulfils the reconnect spec |
| 5 | Design tokens + shared `track-row` component | M | Consistent look, cheaper UI changes |
| 6 | TV layout for viewing from a distance + like counts | M | Most visible screen at the party |
| 7 | Long random host token instead of the PIN as bearer | M | Proper host security |
| 8 | Split `MusicProvider` / `QueueService` | L | Required before YouTube support |
| 9 | Per-party SSE emitters, queue snapshot in the event payload | M | Scales better and cuts redundant requests |

Each item should go through its own OpenSpec change (`openspec/changes/<name>/`) as required by `ai/ARBEITSREGELN.md`.
