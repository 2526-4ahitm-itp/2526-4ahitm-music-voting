# Proposal: iOS Host Synchronized Progress Bar

## Why

The archived change `synchronized-progress-bars` gave the **web** host dashboard a progress bar that mirrors the TV player position via the `progress` SSE relay. The **iOS** host admin view (`AdminDashboard` / `CurrentSongPlaying`) was left behind: it still renders a hardcoded, non-functional `Slider` with fixed `0:13` / `2:46` labels. The iOS host therefore has no real playback position, unlike its web counterpart.

Two gaps block parity:

1. **The iOS SSE stream never receives `progress` events.** `progress` events are emitted with `source=web` and are scoped by `partyId`. The `/spotify/events` filter's `ios` branch only passes `party-ended` and iOS-targeted events (matched by `installationId`), so party-scoped events never reach an iOS client.
2. **The iOS app does not consume or render real progress.** There is no progress SSE listener and no position/duration state; the bar is a static placeholder.

## What Changes

### Cross-client relay (playback domain) — **modifies an existing requirement**
- The `/spotify/events` `ios` branch MUST also deliver party-scoped events — `progress`, `queue-updated`, `track-changed`, `vote-updated` — to an iOS client whose `partyId` matches, in addition to the existing `party-ended` and `installationId`-targeted events.
- The iOS client MUST include `partyId` on its `/spotify/events` query so the backend can match it.

### iOS host control client — `AdminDashboard` (host domain)
- The iOS admin view MUST display a progress bar that mirrors the TV player position, derived from `progress` SSE events (no Spotify API call), matching the web host dashboard.
- A new SSE listener decodes `progress` events and feeds `currentPosition` / `currentDuration` (ms) into the view model; `CurrentSongPlaying` renders position time, an accent-filled bar, and duration time as `m:ss`.
- The hardcoded `Slider` and fixed time labels are removed.

## Non-goals

- No WebSocket transport — the existing SSE event bus is reused (consistent with `synchronized-progress-bars`).
- The iOS app does not run the Spotify Web Playback SDK and is **not** a source of position; it mirrors only. If no web TV player is publishing, the bar stays at 0 (same limitation as the web host dashboard).
- No change to song-advance, queue sorting, voting, or host authorization.

## Verification

- Backend compiles (`mvnw compile`, exit 0).
- iOS target builds in Xcode (cannot be automated in this Linux dev environment — manual build required).
- Live behavior (a web TV player publishing `progress` while the iOS admin view mirrors it) needs a manual Spotify Premium test (see `tasks.md`).
