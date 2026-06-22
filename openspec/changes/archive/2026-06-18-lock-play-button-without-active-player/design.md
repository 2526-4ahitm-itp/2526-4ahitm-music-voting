# Design: Lock Play Button Without Active Playback Device

## Technical Approach

`GET /party/{id}/track/current` (`TrackResource`) is the endpoint both the web host-dashboard and the iOS admin dashboard already call to refresh playback state. It is extended to include `deviceActive: boolean`, computed as `!credentials.getDeviceId().isBlank()` for Spotify parties (always `true` for non-Spotify providers, since no device concept exists for them yet).

Both clients store `deviceActive` alongside the other playback state and bind it to the `disabled` state of Play/Pause/Skip controls. When `deviceActive` is `false`, a short hint is shown near the controls.

## Architecture Decisions

### Decision: Piggyback on `/track/current` instead of a new endpoint
Reuses an existing, already-polled/SSE-refreshed endpoint rather than adding a new device-status endpoint or SSE event type. Because:
- `/track/current` is already called on a regular cadence by both clients
- Avoids an extra round trip and a new SSE event type just for this flag
Alternatives considered: dedicated `GET /spotify/deviceId` check (already exists but isn't polled by these clients) — would require new polling logic in two clients for one boolean.

### Decision: Lock applies per-client, not server-enforced
The backend already returns an error if a play command is sent without a valid device (see `SpotifyMusicProvider.resolvePlayableDeviceId`), so this is purely a UX improvement. No new server-side rejection is added.

## File Changes
- `musicvoting/backend/src/main/java/at/htl/endpoints/TrackResource.java` (modified — add `deviceActive` to `/track/current` response)
- `musicvoting/frontend/src/app/pages/host-dashboard/host-dashboard.ts` (modified — read `deviceActive`, disable controls, show hint)
- `musicvoting/frontend/src/app/pages/host-dashboard/host-dashboard.html` (modified — bind `disabled` + hint text)
- `musicvoting/app/app/views_content/views/AdminDash/AdminDashboard.swift` (modified — read `deviceActive`)
- `musicvoting/app/app/views_content/views/AdminDash/CurrentSongPlaying.swift` (modified — disable controls + hint)
