# Proposal: Progress Sync on Device Reconnect

## Problem

When the TV/startpage browser was reloaded:
1. `restoreCurrentTrackFromBeginningOnDevice` played the song from position 0 on the new SDK device but did NOT update `playbackStartedAt` in the DB.
2. No `track-changed` SSE was emitted, so the host dashboard never knew the restart happened.
3. The dashboard continued computing `currentPosition = Date.now() − OLD_playbackStartedAt`, showing a stuck or wrong progress value.

Additionally, the dashboard accumulated `currentPosition += 1000` on every timer tick, causing drift over time (independent of the reload issue).

## Changes

### Backend — `SpotifyMusicProvider.restoreCurrentTrackFromBeginningOnDevice`
- Added `@Transactional`.
- On a successful Spotify play call: writes `pe.playbackStartedAt = OffsetDateTime.now()` and `pe.pausedPositionMs = null` to `PartyEntity`.

### Backend — `SpotifyTokenResource.setDeviceId`
- Injected `LoginEventBus`.
- After `restoreCurrentTrackFromBeginningOnDevice` returns, emits a `track-changed` SSE event scoped to the party.

### Backend — `SpotifyMusicProvider.getCurrentPlayback`
- When `isPlaying = true`, the response now includes `playbackStartedAt` as an ISO-8601 string alongside `progressMs`.

### Frontend — `host-dashboard.ts`
- Added `playbackStartedAt: number | null` field.
- In `loadCurrentPlayback()`: stores `new Date(res.playbackStartedAt).getTime()` when playing; clears it when paused or track absent.
- In `startProgressTimer()` tick: computes `currentPosition = Date.now() − playbackStartedAt` when the timestamp is available, falling back to `+= 1000` only when absent.

## Result

On startpage reload: song restarts at 0 → `playbackStartedAt = now()` in DB → `track-changed` SSE → dashboard reloads current track → progress bar resets to 0:00. Between events, the dashboard progress bar is always exact (no drift).
