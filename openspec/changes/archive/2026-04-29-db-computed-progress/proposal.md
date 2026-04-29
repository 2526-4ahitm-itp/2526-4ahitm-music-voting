# Proposal: DB-Computed Progress — Eliminate Spotify Polling

## Problem

`GET /track/current` called Spotify's `/me/player/currently-playing` API to obtain `is_playing` and `progress_ms`. This caused rate-limit pressure and made progress dependent on an external poll every 5 seconds on both the host dashboard and the TV startpage.

## Change

- Add `playback_started_at` (TIMESTAMPTZ) and `paused_position_ms` (BIGINT) to the `party` table.
- `play()` sets `playbackStartedAt = now()`, `pausedPositionMs = null`.
- `pausePlayback()` snapshots `pausedPositionMs = now() − playbackStartedAt`.
- `resumePlayback()` adjusts `playbackStartedAt = now() − pausedPositionMs`, clears `pausedPositionMs`.
- `GET /track/current` computes `progressMs` from these fields and reads `isPlaying` from `SpotifyCredentials.lastPlaybackActive` — zero Spotify API calls.
- Remove 5-second polling intervals from `host-dashboard.ts` and `startpage.ts`; all updates are SSE-driven.

No Spotify API is called inside `GET /track/current` anymore.
