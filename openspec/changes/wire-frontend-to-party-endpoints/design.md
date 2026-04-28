# Design: Wire Frontend to Party Endpoints

## Key finding: code-input component reuse

`CodeInput` (`pages/code-input/`) already provides the full 5-digit PIN UI. Rather than creating a separate `JoinComponent`, this change:
- Keeps `CodeInput` at `/code` for manual PIN entry by the guest
- Adds a second route `/join/:pin` also pointing at `CodeInput`; when a `:pin` param is present in `ActivatedRoute`, the component auto-resolves without waiting for input

There is also a stale import in `app.routes.ts` (`'./code-input/code-input'` instead of `'./pages/code-input/code-input'`) that will be fixed in this change.

## PartyService

New `@Injectable({ providedIn: 'root' })` service at `src/app/services/party.service.ts`:

```typescript
export class PartyService {
  private readonly ID_KEY = 'mv_party_id';
  private readonly PIN_KEY = 'mv_party_pin';

  readonly partyId$ = new BehaviorSubject<string | null>(sessionStorage.getItem(ID_KEY));
  readonly pin$     = new BehaviorSubject<string | null>(sessionStorage.getItem(PIN_KEY));

  get currentPartyId(): string | null { return this.partyId$.getValue(); }
  get currentPin(): string | null     { return this.pin$.getValue(); }

  createParty(provider: string): Observable<CreatePartyResponse>
  resolvePin(pin: string): Observable<{ id: string }>
  endParty(id: string): Observable<void>
  clearParty(): void   // no API call — used when party-ended SSE arrives
}
```

`sessionStorage` is used intentionally: it persists through the Spotify OAuth redirect (same tab) but clears on tab close.

## API path pattern

Services and components inject `PartyService` and read `partyService.currentPartyId` synchronously before each HTTP call. If null, log a warning and throw. URL pattern:

| Old | New |
|---|---|
| `/api/track/search?q=…` | `/api/party/{id}/track/search?q=…` |
| `/api/track/queue` | `/api/party/{id}/track/queue` |
| `/api/track/addToPlaylist` | `/api/party/{id}/track/addToPlaylist` |
| `/api/track/play` | `/api/party/{id}/track/play` |
| `/api/track/next` | `/api/party/{id}/track/next` |
| `/api/track/start` | `/api/party/{id}/track/start` |
| `/api/track/pause` | `/api/party/{id}/track/pause` |
| `/api/track/resume` | `/api/party/{id}/track/resume` |
| `/api/track/current` | `/api/party/{id}/track/current` |
| `/api/track/remove` | `/api/party/{id}/track/remove` |
| `/api/spotify/token` | `/api/party/{id}/spotify/token` |
| `/api/spotify/deviceId` | `/api/party/{id}/spotify/deviceId` |
| `/api/spotify/login?source=web` | `/api/party/{id}/spotify/login?source=web` |

The SSE endpoint `/api/spotify/events?source=web` stays at its current path (it is not party-scoped on the backend and the `party-ended` event already includes `partyId` in the payload).

## Party creation flow

New `CreatePartyComponent` at `/create-party`:
1. Host selects provider (Spotify is the only supported option for now)
2. On "Party erstellen": calls `partyService.createParty('spotify')`, waits for response
3. On success: navigates to `/api/party/{id}/spotify/login?source=web` via `window.location.href` (full-page redirect to Spotify OAuth)
4. After OAuth: backend redirects to `http://localhost:4200/dashboard` (the existing `spotify.web.redirect.uri` property)

`home.ts` `gotohostpage()` is simplified: it no longer checks the token; it just navigates to `/create-party`. The session rehydration in `PartyService` handles the "already have a party" case — if the party ID is in `sessionStorage`, the dashboard will find it.

## PIN and QR display on the dashboard

`HostDashboard` reads `partyService.currentPin` and `partyService.currentPartyId` on init and binds them:
```html
<p>PIN: {{ pin }}</p>
<img [src]="'/api/party/' + partyId + '/qr'" alt="QR Code" />
```
No separate API call — the QR is served directly as an `<img>` src.

## "Party beenden" button

Button in `HostDashboard` template. On click: inline confirmation state (a `confirmEnd` boolean flag — no `window.confirm()` to keep it testable). When confirmed: calls `partyService.endParty(partyId)`. On success: navigate to `/`.

## SSE party-ended handling

`HostDashboard` and `Startpage` subscribe to `EventSource('/api/spotify/events?source=web')` (they may already have it; `Startpage` already opens this source). On event type `party-ended`:
- `HostDashboard`: call `partyService.clearParty()` + navigate to `/`
- `Startpage`: navigate to `/` (the TV screen resets)
- `CodeInput` / guest join: if `party-ended` arrives before the guest enters the party view, it is safe to ignore — the `GET /api/party/join/{pin}` call will 404 naturally

`Guest`, `VotingComp`, `SearchHost`, and `VotingHost` have no direct API calls (confirmed by grep); they use `TrackService` / `SpotifyWebPlayerService`. They do not need individual SSE subscriptions for now.

## Files changed

| File | Change |
|---|---|
| `src/app/services/party.service.ts` | **NEW** |
| `src/app/pages/create-party/create-party.{ts,html,css}` | **NEW** |
| `src/app/services/spotify-tracks.ts` | inject PartyService, prefix paths |
| `src/app/services/spotify-player.ts` | inject PartyService, prefix paths |
| `src/app/pages/home/home.ts` | `gotohostpage()` → navigate to `/create-party` |
| `src/app/pages/host-dashboard/host-dashboard.ts` | inject PartyService, prefix 9 API calls, add PIN/QR/end-party/SSE |
| `src/app/pages/host-dashboard/host-dashboard.html` | add PIN display, QR `<img>`, "Party beenden" button |
| `src/app/pages/startpage/startpage.ts` | inject PartyService, prefix 2 track calls, add party-ended SSE handler |
| `src/app/pages/code-input/code-input.ts` | inject PartyService + ActivatedRoute, call resolvePin(), auto-resolve from URL param |
| `src/app/app.routes.ts` | fix CodeInput import, add `/join/:pin` and `/create-party` routes |
