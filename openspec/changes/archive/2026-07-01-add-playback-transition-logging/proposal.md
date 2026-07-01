## Why

Autoplay sometimes pauses on its own, and pressing Play then resumes the *previous* song instead of the one shown on screen — while the "Wiederhol" (restart) button always plays the correct song. This points to the backend's `currentlyPlayingEntryId` drifting out of sync with the track the Spotify device actually holds. The backend currently emits **no logs at all**, so there is no way to observe this drift when it happens on a live party. Diagnostic logging on every start/stop operation is the prerequisite for confirming and fixing the root cause.

## What Changes

- Introduce structured backend logging (via `io.quarkus.logging.Log`) around every playback start/stop operation in `SpotifyMusicProvider`:
  - `startFirstSongWithoutRemoving` (POST `/track/start`)
  - `playNextAndRemove` (POST `/track/next`)
  - `play` (PUT `/track/play`)
  - `pausePlayback` (POST `/track/pause`)
  - `resumePlayback` (POST `/track/resume`)
- Each log line records, at the moment of the operation:
  - the ordered current queue (each entry's `trackName` + `trackUri` + entry `id`),
  - `currentlyPlayingEntryId` (the track the backend considers current / displays),
  - the computed next song (the entry `/track/next` would select),
  - what the Spotify device actually reports as loaded — `is_playing` + `uri` from `getCurrentPlaybackSnapshot`.
- No behavior change: this is observability only. The desync itself is fixed under a separate change (`fix-resume-plays-previous-song`).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `playback`: adds a new requirement that start/stop playback operations emit a diagnostic log line capturing backend-vs-device playback state.

## Impact

- Code: `musicvoting/backend/src/main/java/at/htl/provider/spotify/SpotifyMusicProvider.java` (add logging; small read-only helper to render the queue and fetch the device snapshot). No API contract, DB, or frontend changes.
- Runtime: one extra Spotify `GET /me/player/currently-playing` call per start/stop operation (best-effort; failures must never break playback). Acceptable given start/stop is low-frequency and this is a diagnostic aid.
- No new dependencies (`io.quarkus.logging.Log` ships with Quarkus).
