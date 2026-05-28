# Tasks

## 1. Web — stop Spotify player on party end
- [x] 1.1 Add `async disconnectPlayer()` to `SpotifyWebPlayerService`: pause then disconnect the SDK player, null out the instance
- [x] 1.2 Call `disconnectPlayer()` in `startpage.ts` `party-ended` SSE branch before navigating
- [x] 1.3 Call `disconnectPlayer()` in `startpage.ts` `ngOnDestroy` as a safety net

## 2. iOS — reliable SSE listener with reconnect
- [x] 2.1 Update `Gast_ContentView.listenForPartyEnded()`: use `URLRequest` with `timeoutInterval = .infinity` passed to `URLSession.shared.bytes(for:)`; wrap in `while !Task.isCancelled` loop with 3-second reconnect delay on error
- [x] 2.2 Apply the same fix to `Admin_ContentView.listenForPartyEnded()`
