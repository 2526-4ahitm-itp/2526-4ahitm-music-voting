# Proposal: Fix iOS Host Dashboard Controls and UX

## Intent

After the iOS progress bar feature shipped, several follow-up issues were found during live testing:

1. **Control buttons did nothing.** Play, pause, skip, and remove calls hit `@HostOnly` backend endpoints without an `Authorization: Bearer <hostPin>` header, receiving 403 and silently reverting.
2. **Wrong song played on first press.** The queue preview (first queued song shown before playback) caused `togglePlayPause()` to call `/track/resume` instead of `/track/start`, telling Spotify to resume whatever it had last played — not the queued song.
3. **Progress bar showed stale position on entry.** Entering the dashboard when no song was playing showed the last SSE position from a previous session instead of `0:00`.
4. **Progress bar didn't reset on track change.** When the next song started, `currentPosition` stayed at the previous song's final value until the first `progress` event of the new song arrived.
5. **Host PIN entry used a plain text field** instead of the styled digit-box input already used for guest code entry.
6. **Search crashed with "Backend nicht erreichbar"** on valid responses that contained null/unavailable Spotify tracks, or on non-2xx HTTP errors.

## Scope

In scope:
- Add `Authorization: Bearer <hostPin>` to all iOS host-only requests
- Fix play/pause toggle to use `partyStarted` flag, not `currentSong != nil`
- Reset progress to `0:00` when `track-changed` arrives via SSE
- Reset progress to `0:00` when `loadCurrentPlayback` returns no active track
- Show first queued song as preview before playback starts; filter it from queue list
- Redesign `HostPinEntryView` with digit-box input matching `CodeInputView`
- Handle null Spotify tracks and non-2xx HTTP errors in iOS search

Out of scope:
- Changes to the backend search endpoint or Spotify integration
- Web host dashboard controls (authorization already handled by Angular interceptor)
- Guest view changes

## Approach

All host-only request builders in `AdminDashboardViewModel` are consolidated through a new `hostAuthorizedRequest(url:method:)` helper that reads `partySession?.hostPin` and sets the `Authorization` header. Play/pause logic switches from `currentSong != nil` to `partyStarted` as the gate for resume vs. start. The `listenForProgress()` loop is extended to also handle `track-changed` events: on receipt it resets position/duration to 0 and immediately calls `refreshDashboardState()`. `loadCurrentPlayback()` resets position when `response.track` is nil. `HostPinEntryView` is rewritten to match `CodeInputView`'s hidden-field + digit-box pattern with auto-submit and shake animation. In `SongAddView`, `TrackItem` items are decoded as `[TrackItem?]` and filtered with `compactMap` to skip nulls; the HTTP status code is checked before attempting to decode.
