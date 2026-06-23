# Tasks

## 1. Web: shared queue-state service
- [x] 1.1 Create `musicvoting/frontend/src/app/services/queue-state.ts` with `QueueStateService`: `inQueueUris$: Observable<Set<string>>` and `refresh()` backed by `SpotifyWebPlayerService.getQueue()`

## 2. Web: guest search
- [x] 2.1 In `guest.ts`, inject `QueueStateService`, subscribe to `inQueueUris$` into a component field `inQueueUris: Set<string>`
- [x] 2.2 Open/extend the SSE subscription in `guest.ts` to call `queueState.refresh()` on `queue-updated`
- [x] 2.3 In `guest.ts` `addToPlaylist()`, call `queueState.refresh()` after a successful add
- [x] 2.4 In `guest.html`, disable the add button and render the checkmark when `inQueueUris.has(track.uri)`

## 3. Web: host search
- [x] 3.1 In `search-host.ts`, add an SSE subscription (mirroring `voting-comp.ts`) that calls `queueState.refresh()` on `queue-updated`
- [x] 3.2 Inject `QueueStateService`, subscribe to `inQueueUris$`, and call `refresh()` after a successful add (same as 2.1/2.3)
- [x] 3.3 In `search-host.html`, disable the add button and render the checkmark when `inQueueUris.has(track.uri)`

## 4. iOS: SongAddViewModel queue state
- [x] 4.1 Add `@Published var queuedTrackUris: Set<String>` and `loadQueue()` (GET `track/queue`, decode, collect `uri`s) to `SongAddViewModel`
- [x] 4.2 Call `loadQueue()` when `SongAddView` appears
- [x] 4.3 Subscribe to the party SSE stream (`PartySession.sseEventsURL`) filtered to `queue-updated`; call `loadQueue()` on receipt
- [x] 4.4 Call `loadQueue()` again after a successful `addToPlaylist`

## 5. iOS: SongAddView button state
- [x] 5.1 Compute `isQueued = queuedTrackUris.contains(track.uri ?? "") || addedTrackIds.contains(track.id)`
- [x] 5.2 Show checkmark and `.disabled(isAdding || isQueued)` based on `isQueued`

## 6. Verify
- [ ] 6.1 Manually verify: add a song from one client, confirm the checkmark appears (disabled) on a second client's open search results without manual refresh, on web and iOS
- [ ] 6.2 Manually verify: removing the song from the queue (host dashboard) reverts the button back to "+" on clients with that result still on screen

> Note: 6.1/6.2 require running the full stack (backend + DB + two clients) and an iOS simulator/device — not run in this session. Web frontend type-checks and builds cleanly with the new code.
