# Δ host/spec.md

## ADDED Requirements

### Requirement: iOS Admin View Shows Synchronized Progress Bar
The iOS host admin view MUST display a progress bar for the current song, kept in sync with the TV player, matching the web host dashboard (see "Host Sees Synchronized Progress Bar"). Because the iOS app does not run the Spotify Web Playback SDK, it MUST derive the position from `progress` SSE events (see `playback/spec.md` "Cross-Client Playback Progress Relay") rather than polling Spotify.

- The iOS admin view MUST maintain an SSE connection that supplies the party's `partyId`, so the backend delivers party-scoped `progress` events to it.
- On each `progress` event the view MUST set `currentPosition` / `currentDuration` (milliseconds) from the payload — whose values arrive as strings — and recompute the bar fraction (`position / duration`, clamped to `0…1`).
- The bar MUST render elapsed time, an accent-colored fill, and total time; both times MUST display as `m:ss`, measured against the event `duration`. When no `progress` event has arrived (no active TV player), the bar MUST read `0:00` and show no fill.
- The hardcoded placeholder slider MUST be removed.

#### Scenario: iOS progress bar mirrors the player
- GIVEN the iOS host admin view and the TV player are on the same party
- WHEN the player publishes its position via the progress relay
- THEN the iOS admin view's progress bar reflects that position within ~1 s
- AND the iOS app makes no Spotify API call to obtain it

#### Scenario: No active player leaves the bar at zero
- GIVEN the iOS host admin view is open and no TV player is publishing progress
- THEN the progress bar shows `0:00` with no fill
