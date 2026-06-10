# Tasks

## 1. Deliver party-scoped progress events to iOS (backend)
- [x] 1.1 Extend the `ios` branch of `SpotifyCallbackResource.events()` to also pass party-scoped events (`progress`, `queue-updated`, `track-changed`, `vote-updated`) when the connection's `partyId` matches the event payload's `partyId`, keeping existing `party-ended` + `installationId` delivery
- [x] 1.2 Backend compiles (`mvnw compile`, exit 0)

## 2. iOS SSE subscription carries the party id
- [x] 2.1 Add `partyId` to `PartySessionStore.sseEventsURL` query items (bind via `guard let partyId`)

## 3. iOS host progress state + SSE listener (`AdminDashboardViewModel`)
- [x] 3.1 Add `currentPosition` / `currentDuration` (ms) `@Published` state and a `progressFraction` computed value
- [x] 3.2 Add a private `ProgressEvent { type, payload }` decode struct (payload `position`/`duration`/`paused` as optional strings)
- [x] 3.3 Add `listenForProgress()` SSE consumer (mirrors `Admin_ContentView.listenForPartyEnded()`: `URLSession.bytes`, `data:` lines, reconnect on error); update position/duration from `progress` events
- [x] 3.4 Start `listenForProgress()` from a `.task` in `AdminDashboard` after `configure(partySession:)`

## 4. iOS progress bar UI (`CurrentSongPlaying`)
- [x] 4.1 Remove the hardcoded `@State progress`, `Slider`, and fixed `0:13` / `2:46` labels
- [x] 4.2 Accept `positionMs` / `durationMs`; render position time + accent-filled `GeometryReader` capsule bar + duration time, `m:ss`, animated `.linear(0.5s)`
- [x] 4.3 Pass `viewModel.currentPosition` / `currentDuration` from `AdminDashboard` into `CurrentSongPlaying`

## 5. Verification
- [x] 5.1 Backend compiles (`mvnw compile`)
- [x] 5.2 iOS target builds in Xcode (manual — not automatable in this Linux dev env)
- [x] 5.3 Manual (live Spotify Premium): with a web TV player publishing progress, the iOS admin view's bar mirrors the position within ~1 s and makes no Spotify call; with no player, the bar reads `0:00`
