# Tasks

## 1. PartyService

- [x] 1.1 Create `src/app/services/party.service.ts` with:
  - `BehaviorSubject<string | null>` for `partyId$` and `pin$`, rehydrated from `sessionStorage` keys `'mv_party_id'` / `'mv_party_pin'`
  - `get currentPartyId()` and `get currentPin()` synchronous getters
  - `createParty(provider: string): Observable<{id: string, pin: string, joinUrl: string}>` — POST `/api/party`, then store id + pin in subjects + sessionStorage
  - `resolvePin(pin: string): Observable<{id: string}>` — GET `/api/party/join/${pin}`, then store id in subject + sessionStorage
  - `endParty(id: string): Observable<void>` — DELETE `/api/party/${id}`, then clear both subjects + sessionStorage
  - `clearParty(): void` — clears subjects + sessionStorage without an API call (used for SSE party-ended)

## 2. Update services

- [x] 2.1 Update `src/app/services/spotify-tracks.ts`:
  - Inject `PartyService`
  - `searchTracks(query)`: `/api/track/search` → `/api/party/${id}/track/search`
  - `startParty()`: `/api/track/next` → `/api/party/${id}/track/next`
- [x] 2.2 Update `src/app/services/spotify-player.ts`:
  - Inject `PartyService`
  - `initPlayer()` token fetch: `/api/spotify/token` → `/api/party/${id}/spotify/token`
  - `createAndConnectPlayer()` deviceId PUT: `/api/spotify/deviceId` → `/api/party/${id}/spotify/deviceId`
  - `login()`: `/api/spotify/login?source=web` → `/api/party/${id}/spotify/login?source=web`
  - `addToPlaylist(uri)`: `/api/track/addToPlaylist` → `/api/party/${id}/track/addToPlaylist`
  - `getQueue()`: `/api/track/queue` → `/api/party/${id}/track/queue`
  - `playTrack(uri)`: `/api/track/play` → `/api/party/${id}/track/play`

## 3. CreatePartyComponent

- [x] 3.1 Create `src/app/pages/create-party/create-party.ts`:
  - Inject `PartyService` and `Router`
  - `create()` method: calls `partyService.createParty('spotify')`, on success navigates to `/api/party/{id}/spotify/login?source=web` via `window.location.href`
  - `isLoading` and `error` state fields
- [x] 3.2 Create `src/app/pages/create-party/create-party.html`:
  - "Party erstellen" heading
  - Provider shown as "Spotify" (static for now)
  - "Party erstellen" button bound to `create()`
  - Loading state and error display
- [x] 3.3 Create `src/app/pages/create-party/create-party.css` with basic styling consistent with the rest of the app

## 4. Update app.routes.ts

- [x] 4.1 Fix the `CodeInput` import: change `'./code-input/code-input'` to `'./pages/code-input/code-input'`
- [x] 4.2 Add `CreateParty` import and route: `{ path: 'create-party', component: CreateParty, title: 'Party erstellen - MusicVoting' }`
- [x] 4.3 Add `/join/:pin` route: `{ path: 'join/:pin', component: CodeInput, title: 'Party beitreten - MusicVoting' }`

## 5. Update CodeInput (join flow)

- [x] 5.1 Inject `PartyService`, `ActivatedRoute`, and `Router` into `CodeInput`
- [x] 5.2 In `ngOnInit`: read `:pin` from `ActivatedRoute.snapshot.params['pin']`; if present, auto-call `resolveAndJoin(pin)` immediately (skip manual input)
- [x] 5.3 Replace `checkCode()` body: collect entered digits → call `partyService.resolvePin(pin).subscribe()`:
  - on success: navigate to `/guest`
  - on error (404): set `showError = true`, error message `"Party nicht gefunden."`
- [x] 5.4 Remove `private readonly SECRET_CODE = '12345'` and the hardcoded comparison

## 6. Update Home

- [x] 6.1 In `home.ts` `gotohostpage()`: remove the token check and login redirect; replace with `this.router.navigate(['/create-party'])`

## 7. Update HostDashboard

- [x] 7.1 Inject `PartyService` into `HostDashboard`; read `partyId` and `pin` from `partyService.currentPartyId` / `partyService.currentPin` in `ngOnInit`
- [x] 7.2 Prefix all 9 direct HTTP calls with `/api/party/${this.partyId}`:
  - `GET /api/track/queue` → `GET /api/party/${partyId}/track/queue`
  - `GET /api/track/current` → `GET /api/party/${partyId}/track/current`
  - `POST /api/track/start` → `POST /api/party/${partyId}/track/start`
  - `POST /api/track/resume` → `POST /api/party/${partyId}/track/resume`
  - `POST /api/track/pause` → `POST /api/party/${partyId}/track/pause`
  - `PUT /api/track/play` → `PUT /api/party/${partyId}/track/play`
  - `DELETE /api/track/remove` → `DELETE /api/party/${partyId}/track/remove`
  - `POST /api/track/next` → `POST /api/party/${partyId}/track/next`
- [x] 7.3 Add `pin` and `qrUrl` fields; set `qrUrl = '/api/party/' + partyId + '/qr'` in `ngOnInit`
- [x] 7.4 Add `confirmEnd = false` flag and `endParty()` method; `endParty()` calls `partyService.endParty(partyId)` → on success: navigate to `/`
- [x] 7.5 Add SSE subscription in `ngOnInit` to `GET /api/spotify/events?source=web`; on `party-ended` event: call `partyService.clearParty()` + navigate to `/`; unsubscribe in `ngOnDestroy`
- [x] 7.6 Update `host-dashboard.html`: add PIN display, QR `<img [src]="qrUrl">`, and "Party beenden" button (with inline confirm state)

## 8. Update Startpage

- [x] 8.1 Inject `PartyService` into `Startpage`; read `partyId` from `partyService.currentPartyId`
- [x] 8.2 Update `GET /api/track/current` → `GET /api/party/${partyId}/track/current`
- [x] 8.3 Update `POST /api/track/next` → `POST /api/party/${partyId}/track/next`
- [x] 8.4 The existing `EventSource('/api/spotify/events?source=web')` already handles SSE; add a handler for `party-ended` event type that navigates to `/`

## 9. Verify

- [x] 9.1 Start stack: `cd musicvoting && docker compose up -d`, `cd frontend && npm start`
- [ ] 9.2 Guest join: navigate to `/code` → enter an active party PIN → confirm redirect to `/guest`
- [ ] 9.3 Guest join via QR URL: navigate to `/join/{pin}` → confirm auto-resolve and redirect to `/guest`
- [ ] 9.4 Guest join invalid PIN: navigate to `/join/00000` → confirm "Party nicht gefunden." error shown
- [ ] 9.5 Host create party: navigate to `/` → click host button → `/create-party` → "Party erstellen" → Spotify OAuth → `/dashboard` with PIN and QR visible
- [ ] 9.6 Queue operations: search, add track, view queue — confirm requests go to `/api/party/{id}/track/…` in browser devtools Network tab
- [ ] 9.7 Party beenden: click button on dashboard, confirm → `DELETE /api/party/{id}` called, redirected to `/`
- [ ] 9.8 Party-ended SSE: in one tab end the party via dashboard; confirm open guest tab / startpage redirects to home
