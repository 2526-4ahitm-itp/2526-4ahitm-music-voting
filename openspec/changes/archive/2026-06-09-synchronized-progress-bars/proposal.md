# Proposal: Synchronized Progress Bars + Resume-on-Handoff

## Why

1. **TV player progress bar drifted.** On `/startpage` the bar advanced via a local `setInterval(+1000 ms)` between Spotify SDK `player_state_changed` events, so it drifted from the real track position and ignored seeks. The percentage was measured against stale queue metadata (`duration_ms`) instead of the SDK's `duration`.
2. **Host control client had no progress bar.** `host-dashboard` showed the current song and controls but no playback position.
3. **Opening the player rewound the song ~30 s.** Registering the Web Playback SDK device (`PUT /spotify/deviceId`) replayed the current track from position 0, so a song already ~30 s in jumped back to the start.
4. **Host play/pause icons were swapped** — the button showed ⏸ when stopped/paused and ▶ while playing.

## What Changes

### TV player — `/startpage` (dashboard domain)
- The progress bar re-syncs to the SDK's real position each second via `player.getCurrentState()` instead of accumulating a counter; the percentage uses the SDK `duration`.
- Publishes `{position, duration, paused}` ~1×/s to `POST /party/{id}/track/progress`.

### Cross-client relay (playback domain)
- New `POST /party/{id}/track/progress` re-broadcasts position as a `progress` SSE event on the existing `LoginEventBus` — **no WebSocket, no new dependency**.
- The `/spotify/events` web filter passes `progress` events to clients of the matching party.

### Host control client — `host-dashboard` (host domain)
- A progress bar mirrors the player position from `progress` SSE events, rendered **below** the control buttons.
- Fixed the swapped play/pause icons (▶ when stopped/paused, ⏸ while playing).

### Device handoff (playback domain) — **modifies an existing agreed requirement**
- `restoreCurrentTrackFromBeginningOnDevice` → renamed `restoreCurrentTrackOnDevice`; it now resumes at the party's tracked position (`position_ms`) instead of 0:00, and sets `playbackStartedAt = now() − position` to keep the elapsed-progress model consistent.
- ⚠️ This **supersedes** `playback/spec.md` → "Device Re-registration Resets Progress" (which mandated play-from-0:00 and a reset-to-0:00 progress bar). See the playback delta.

## Non-goals

- No WebSocket transport — the existing SSE event bus is reused (decision made with the team lead).
- No change to song-advance, queue sorting, or host authorization.

## Verification

- Backend compiles (`mvnw compile`, exit 0).
- Frontend logic covered by Jasmine specs — `startpage.progress.spec.ts` (5) + `host-dashboard.progress.spec.ts` (4) = 9 passing.
- Live Spotify behavior (SDK `getCurrentState`, `position_ms` resume) is not automatable here; it needs a manual Premium test (see `tasks.md` 5.3).
