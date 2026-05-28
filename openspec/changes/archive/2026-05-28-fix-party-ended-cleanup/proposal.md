# Proposal: Fix Party-Ended Cleanup (Music Stop + iOS SSE Reconnect)

## Intent
Two bugs remain after the party-ended propagation work:
1. **Web — music keeps playing**: when `party-ended` is received on the startpage (TV/dashboard) and the app navigates to `/`, the Spotify Web Playback SDK player is never paused or disconnected. The music continues playing on the device even though the party is over.
2. **iOS — guest stays logged in**: the SSE listener added to `Gast_ContentView` uses `URLSession.shared.bytes(from:)` which inherits the default 60-second request timeout. If no iOS-targeted events arrive within 60 seconds the connection silently closes, the listener exits, and the guest never receives the `party-ended` event when the host later ends the party.

## Scope
In scope:
- Web: add a `disconnectPlayer()` method to `SpotifyWebPlayerService`; call it in `startpage.ts` when `party-ended` fires and in `ngOnDestroy` as a safety net
- iOS: replace `URLSession.bytes(from:)` with `URLSession.bytes(for:)` using a `URLRequest` with `timeoutInterval = .infinity`; wrap the stream in a reconnect loop so a dropped connection is re-opened automatically

Out of scope:
- Stopping playback on other events (e.g. queue empty — that is already specced separately)
- iOS admin SSE reliability (same fix applied there too since it shares the same pattern)

## Approach
**Web**: `SpotifyWebPlayerService.disconnectPlayer()` calls `player.pause()` then `player.disconnect()` and nulls out the instance. `startpage.ts` calls it in the `party-ended` SSE branch and in `ngOnDestroy`. Calling it in `ngOnDestroy` alone would be sufficient, but calling it eagerly in the handler stops the music faster.

**iOS**: Create a `URLRequest` with `timeoutInterval = .infinity` and pass it to `URLSession.shared.bytes(for:)`. Wrap the entire connection attempt in a `while !Task.isCancelled` loop so that a dropped connection (timeout, network blip) causes an automatic 3-second-delayed reconnect. SwiftUI's `.task` modifier still cancels the loop when the view disappears.
