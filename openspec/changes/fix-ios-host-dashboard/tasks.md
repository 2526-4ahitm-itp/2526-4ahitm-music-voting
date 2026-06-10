# Tasks

## 1. Authorization header for host-only iOS requests
- [x] 1.1 Add `hostAuthorizedRequest(url:method:)` helper to `AdminDashboardViewModel` that sets `Content-Type` and `Authorization: Bearer <hostPin>`
- [x] 1.2 Replace manual `URLRequest` construction in `performPostRequest(url:)`, `performPostRequest(url:decode:)`, `performPutRequest(url:body:)`, and `deleteSong(uri:)` with `hostAuthorizedRequest`

## 2. Fix play/pause toggle (start vs. resume)
- [x] 2.1 Change the `togglePlayPause()` branch condition from `currentSong != nil` to `partyStarted`

## 3. Progress bar reset on track change and empty state
- [x] 3.1 Extend the `listenForProgress()` SSE loop to handle `track-changed` events: reset `currentPosition = 0`, `currentDuration = 0`, and call `await refreshDashboardState()`
- [x] 3.2 Update `listenForProgress()` to also update `isPlaying` from the `paused` field on each `progress` event
- [x] 3.3 In `loadCurrentPlayback()`, reset `currentPosition = 0` and `currentDuration = 0` when `response.track == nil`

## 4. Queue preview before playback starts
- [x] 4.1 In `loadQueue()`, if `currentSong == nil` and the queue is non-empty, set `currentSong` to `allSongs.first`
- [x] 4.2 Filter the current song's URI out of `queueSongs` in `loadQueue()` to avoid duplication

## 5. Host PIN entry digit-box UI
- [x] 5.1 Rewrite `HostPinEntryView` to use the hidden-field + five digit-box pattern from `CodeInputView`
- [x] 5.2 Auto-submit on fifth digit; remove the "Weiter" button
- [x] 5.3 On error: `UINotificationFeedbackGenerator` haptic + `ShakeEffect` animation + clear input

## 6. Search null-track and HTTP error handling
- [x] 6.1 Change `TrackContainer.items` from `[TrackItem]` to `[TrackItem?]` and apply `compactMap { $0 }` after decode
- [x] 6.2 Check HTTP status code before decoding; show "Suche fehlgeschlagen" on non-2xx without entering the catch block

## 7. Verification
- [x] 7.1 Play, pause, resume, skip, and remove buttons reach the backend and produce correct playback changes
- [x] 7.2 First tap on play calls `/track/start`; subsequent pause/play cycles use `/track/pause` and `/track/resume`
- [x] 7.3 Progress bar shows `0:00` on dashboard entry when no song is active
- [x] 7.4 Progress bar resets to `0:00` immediately when a new track starts
- [x] 7.5 First queued song appears in the current-song area before playback; disappears from the queue list
- [x] 7.6 Host PIN entry: auto-submits on fifth digit; shakes on wrong PIN
- [x] 7.7 Search returns results even when the Spotify response includes null track entries
