# Design: Implement Voting

## Technical Approach

The `vote` table already existed in `setup.sql` with the correct unique constraint. The backend implementation lives entirely in `SpotifyMusicProvider`: `toggleVote` finds the queue entry by `(partyId, trackUri)`, toggles the vote row, and returns `{liked, likeCount}`. The `TrackResource` endpoint emits a `vote-updated` SSE event on success.

A new `getQueueForDevice(Party, String deviceId)` method was added to the `MusicProvider` interface (with a default no-op fallback) and implemented in `SpotifyMusicProvider` using a single SQL query with a conditional `COUNT(CASE WHEN v.device_id = :deviceId THEN 1 END) > 0` to compute `hasVoted` alongside `likeCount`. The `GET /queue` endpoint routes to this method when `?deviceId=` is provided.

On the client side, `deviceId` is a persistent UUID generated once and stored durably. The web stores it in both localStorage and a 1-year cookie so it survives clearing either one individually. iOS stores it in `UserDefaults` under `spotify.installation.id` (reusing the existing SSE installation ID). Clients pass `deviceId` on every queue fetch to get the `hasVoted` flag back, and on every vote request. The `voting-comp` in Angular and `VotingView` in SwiftUI apply optimistic updates on the heart button and revert on error.

## Architecture Decisions

### Decision: `getQueueForDevice` as a separate method, not a param on `getQueue`
Added a new interface method with a default fallback rather than changing the existing `getQueue` signature. This keeps all internal callers (playback logic, `SongAddViewModel`) unchanged — they don't need `hasVoted` and should not have to pass a `deviceId`.

### Decision: `deviceId` reuses `spotify.installation.id` on iOS
The iOS app already generated a persistent installation UUID for SSE deduplication. Reusing it as `deviceId` keeps identity consistent: the same device that listens to SSE events is the same identity that votes.

### Decision: Cookie as fallback for web `deviceId`
Cookies are shared across browsers on the same device (same domain), unlike `localStorage` which is browser-scoped. Adding a 1-year cookie as a fallback means opening the app in a second browser on the same phone recovers the same `deviceId` instead of generating a new one, reducing accidental double-voting.

### Decision: Optimistic UI update with server reconciliation
The vote button updates immediately on tap (toggle `hasVoted`, ±1 `likeCount`) without waiting for the network response. The actual response from the server overwrites the optimistic state, ensuring correctness. If the request fails, the original state is restored.

## Data Flow

```
Guest taps heart
  → toggleVote(uri, deviceId) → POST /party/{id}/track/vote
  ← {liked, likeCount}
  → update local entry (or revert on error)

Backend on vote success
  → emits vote-updated SSE

All connected clients
  → receive vote-updated SSE
  → reload GET /party/{id}/track/queue?deviceId=<id>
  ← [{..., likeCount, hasVoted}, ...]
  → re-render queue (sorted by likeCount DESC, addedAt ASC)
```

## File Changes
- `musicvoting/backend/src/main/java/at/htl/provider/MusicProvider.java` (modified — added `getQueueForDevice`)
- `musicvoting/backend/src/main/java/at/htl/provider/spotify/SpotifyMusicProvider.java` (modified — implemented `getQueueForDevice`)
- `musicvoting/backend/src/main/java/at/htl/endpoints/TrackResource.java` (modified — `?deviceId` param on `GET /queue`)
- `musicvoting/frontend/src/app/services/party.service.ts` (modified — `deviceId` getter with localStorage + cookie)
- `musicvoting/frontend/src/app/services/spotify-player.ts` (modified — `getQueue(deviceId?)`, `toggleVote`)
- `musicvoting/frontend/src/app/pages/voting-comp/voting-comp.ts` (modified — wired vote logic)
- `musicvoting/frontend/src/app/pages/voting-comp/voting-comp.html` (modified — heart button, like count)
- `musicvoting/frontend/src/app/pages/voting-comp/voting-comp.css` (modified — `.vote-section`, `.like-count`)
- `musicvoting/app/app/functionality/PartySession.swift` (modified — extracted `deviceId` computed property)
- `musicvoting/app/app/views_content/views/VotingView.swift` (modified — full implementation)
