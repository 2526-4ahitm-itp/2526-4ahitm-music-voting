# Tasks

## 1. TV player progress bar — sync to SDK (`startpage`)
- [x] 1.1 Add `getCurrentState()` to `SpotifyWebPlayerService` wrapping `player.getCurrentState()`
- [x] 1.2 Re-sync `currentPosition`/`currentDuration` from the SDK each timer tick; fall back to `+= 1000 ms` only when the SDK returns no state
- [x] 1.3 Measure `progressPercent` against the SDK `duration`, falling back to the queue entry `duration_ms`
- [x] 1.4 `startpage.progress.spec.ts` (5 cases) green

## 2. Cross-client progress relay over SSE (backend + player)
- [x] 2.1 `POST /party/{id}/track/progress` emits a `progress` `LoginEvent` (position/duration/paused + `source=web`, `partyId`)
- [x] 2.2 `/spotify/events` web filter passes `progress` events to matching-party clients
- [x] 2.3 Player publishes `{position, duration, paused}` to the endpoint ~1×/s (guarded by `partyId`)

## 3. Host control client (`host-dashboard`)
- [x] 3.1 Mirror player position from `progress` SSE via `applyProgress()` (+ `updateProgressPercent`, `formatTime`)
- [x] 3.2 Render the progress bar below the control buttons
- [x] 3.3 Fix swapped play/pause icons (▶ when stopped/paused, ⏸ while playing)
- [x] 3.4 `host-dashboard.progress.spec.ts` (4 cases) green

## 4. Device handoff resumes at current position (backend)
- [x] 4.1 Add `currentPlaybackPositionMs(party)` from `pausedPositionMs` / `playbackStartedAt`
- [x] 4.2 Play with `position_ms` on device handoff instead of 0; set `playbackStartedAt = now() − position`
- [x] 4.3 Rename `restoreCurrentTrackFromBeginningOnDevice` → `restoreCurrentTrackOnDevice` and update the call site

## 5. Verification
- [x] 5.1 Backend compiles (`mvnw compile`)
- [x] 5.2 Frontend specs pass (9)
- [ ] 5.3 Manual (live Spotify Premium): player bar tracks audio + survives a seek; host bar mirrors within ~1 s; opening the player resumes the song (no 30 s rewind)
