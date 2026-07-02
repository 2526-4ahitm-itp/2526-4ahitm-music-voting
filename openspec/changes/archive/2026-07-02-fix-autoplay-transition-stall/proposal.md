## Why

Autoplay stalls at every track boundary: when a song ends, the backend correctly advances `currentlyPlayingEntryId` to the next entry, but the Spotify **Web Playback SDK device does not actually start the next track** — it stays paused on the finished song. The host must press **Play** to continue, at which point the (already correct) resume plays the displayed song.

Root cause, confirmed from live diagnostic logs (parties `90659d9e`, `1a4c42e0` on 2026-07-01): the startpage advances **only after the SDK has already paused at end-of-track** (`maybeAdvanceOnEnd` fires on `paused && position≈0`). So `POST /track/next` → `play(next)` is issued *into the end-of-track transition window*, where the SDK device has just paused (and may briefly drop to `not_ready`, falling off `GET /me/player/devices`) while Spotify's server-side `currently-playing` still lags on the previous track. In that window the `PUT /me/player/play` returns `2xx` but does not take — likely because `resolvePlayableDeviceId` can't find the just-dropped SDK device and targets a stale/phantom one (every party start shows a residual `device=<previous test's last track>`). Once the SDK device settles (seconds later), the identical play call from **resume** works — which is exactly why resume always works but autoplay stalls.

This is **not** a regression from `fix-resume-plays-previous-song`; it is the long-standing "autoplay pauses on its own." That change was masking it with wrong-song replays; removing the mask made it plainly reproducible.

## What Changes

- **Advance reliably starts the next track on the SDK device.** `playNextAndRemove`'s play step MUST ensure the intended playback device is active at the moment of `play(next)`, rather than issuing a bare `play(uris)` into a device that just paused/dropped at end-of-track. Leading approach: activate/transfer playback to the resolved (SDK) device — mirroring `restoreCurrentTrackOnDevice`, whose transfer path already recovers a not-ready device — then play the next uri. (Exact fix chosen after the diagnostic step below confirms the mechanism.)
- **Device-resolution diagnostics.** Extend the existing playback logging so `play`/advance records the *resolved device id* and the `GET /me/player/devices` snapshot (each device's `id`, `is_active`, `name`), so the "SDK device dropped / wrong device targeted" hypothesis is confirmed and the fix is verifiable.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `playback`: strengthens auto-advance so the next track actually begins on the intended device without a manual Play; adds device-resolution diagnostics to the advance/play path.

## Impact

- Code: `musicvoting/backend/src/main/java/at/htl/provider/spotify/SpotifyMusicProvider.java` — `playNextAndRemove` / `play` / `resolvePlayableDeviceId` (device activation on advance; diagnostics). Possibly `musicvoting/frontend/src/app/pages/startpage/startpage.ts` if the decision is to advance slightly before end instead of after the SDK pauses.
- Behavior: autoplay continues across track boundaries without the host pressing Play.
- Runtime: advance may make one extra Spotify call (device transfer) — low frequency (once per song). No DB schema, API-contract, or endpoint-signature changes.
- Depends on `fix-resume-plays-previous-song` (resume re-assert + `[playback …]` logging) being in place — this change builds on that logging.
