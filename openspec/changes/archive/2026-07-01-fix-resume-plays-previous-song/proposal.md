## Why

On a live party, pressing **Play** (resume) sometimes starts the *previous* song instead of the one shown on screen, while the **Wiederhol** (restart) button always plays the correct song — and autoplay occasionally "pauses on its own." Root cause: `resumePlayback` issues a bare Spotify play with **no `uris`**, so it replays whatever track the device currently holds. After an auto-advance, the backend's `currentlyPlayingEntryId` (song B) can drift from what the device actually loaded (song A) — because `playNextAndRemove` commits `current = B` on a `2xx` from `PUT /me/player/play`, even though a `2xx` does not guarantee the device actually switched tracks. Resume then plays A; Wiederhol works because it calls `play` with an explicit uri.

> **Scope revised 2026-07-01 after the first deploy.** An initial version also *hardened the advance commit* by reading `getCurrentPlaybackSnapshot` right after the play call and refusing to commit when the device still reported the previous track. The live diagnostic logs proved this refuses **healthy** advances: Spotify's `currently-playing` lags the play command by seconds and keeps reporting the *previous* uri during that window, so the check mistook normal transitions for drift — pinning `current` to the just-finished song, stalling autoplay, and making resume replay it. That advance-confirmation is therefore **dropped**; advance goes back to committing on `2xx`. See `design.md`.

## What Changes

- **Fix resume desync**: `resumePlayback` MUST re-assert the current track's uri instead of a bare resume. It plays `currentlyPlayingEntryId`'s uri at the paused position, so resume always plays the displayed song regardless of what the device holds. Falls back to a bare resume only when there is no known current track.
- **Advance commits on `2xx`** (unchanged from before this change): `playNextAndRemove` commits `currentlyPlayingEntryId` to the new entry once the play call returns `2xx`. It does **not** read the device snapshot to gate the commit — the live logs showed that snapshot is too laggy to distinguish real drift from normal propagation. Residual drift is instead made *observable* by the logging, and corrected deterministically by the resume re-assert / `Wiederhol`.
- **Diagnostic logging** (same as `add-playback-transition-logging`): every start/stop operation logs the ordered queue, `currentlyPlayingEntryId`, the computed next song, and the device-loaded uri + `is_playing`, so the fix can be verified and any residual drift observed.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `playback`: changes resume behavior to re-assert the current uri; adds the start/stop diagnostic-logging requirement. (Advance behavior is unchanged — commit on `2xx`.)

## Impact

- Code: `musicvoting/backend/src/main/java/at/htl/provider/spotify/SpotifyMusicProvider.java` — `resumePlayback` and a shared logging helper. The advance-confirmation code added in the first cut of this change is reverted. No DB schema, API contract, or frontend changes; the existing `/track/resume` and `/track/next` endpoints keep their signatures.
- Behavior: resume becomes deterministic (always the displayed song); advance keeps its pre-existing commit-on-`2xx` behavior (no autoplay stall).
- Runtime: resume issues the same single play call as before (position already tracked in `PartyEntity`); advance makes no extra Spotify call. No new dependencies.
- Supersedes `add-playback-transition-logging` — if this change ships, that logging-only change is redundant and can be dropped.
