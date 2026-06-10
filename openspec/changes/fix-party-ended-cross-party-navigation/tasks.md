# Tasks

## 1. Backend — scope party-ended in SSE filter
- [x] 1.1 Wrap `"party-ended".equals(event.type())` in the `ios` branch of `SpotifyCallbackResource.events()` with `(iosPartyId.isBlank() || iosPartyId.equals(event.payload().get("partyId")))`
- [x] 1.2 Apply the same partyId guard to `"party-ended"` in the `web` branch
- [x] 1.3 Backend compiles (`mvnw compile`, exit 0)

## 2. iOS — client-side defense-in-depth
- [x] 2.1 Extend `SSEEvent` in `Admin_ContentView.swift` to decode `payload: [String: String]?`
- [x] 2.2 Add `event.payload?["partyId"] == partySession.partyId` guard in `Admin_ContentView.listenForPartyEnded()` before clearing the session
- [x] 2.3 Apply the same payload + partyId extension and guard to `Gast_ContentView.swift`

## 3. Web — client-side defense-in-depth
- [x] 3.1 Add `&& data?.payload?.partyId === this.partyId` check to the `party-ended` branch in `HostDashboard.startPartyEndedStream()`

## 4. Verification
- [x] 4.1 Ending party A does not navigate the host dashboard or iOS app of party B to the start page
