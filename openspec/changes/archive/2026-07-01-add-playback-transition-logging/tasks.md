## 1. Logging helper

- [x] 1.1 Add a `private void logPlaybackTransition(String op, Party party)` helper to `SpotifyMusicProvider`
- [x] 1.2 In the helper, load the ordered queue (reuse the existing `getQueue`/native-query source) and render each entry as `name | uri | id`
- [x] 1.3 Read `PartyEntity.currentlyPlayingEntryId` and resolve its `QueueEntry` for the "current/displayed" part of the line
- [x] 1.4 Compute the "next song" the same way `playNextAndRemove` does (first queue entry whose id ≠ `currentlyPlayingEntryId`); render "none" when absent
- [x] 1.5 Best-effort call `getCurrentPlaybackSnapshot` inside its own try/catch; render the device-loaded `uri` + `is_playing`, or "unavailable" on failure/no content
- [x] 1.6 Emit one `Log.infof(...)` line including op, party id, queue, current, next, and device-loaded track

## 2. Wire into start/stop operations

- [x] 2.1 Call `logPlaybackTransition("START", party)` at the top of `startFirstSongWithoutRemoving`
- [x] 2.2 Call `logPlaybackTransition("NEXT", party)` at the top of `playNextAndRemove` (before the advance logic)
- [x] 2.3 Call `logPlaybackTransition("PLAY", party)` at the top of `play`
- [x] 2.4 Call `logPlaybackTransition("PAUSE", party)` at the top of `pausePlayback`
- [x] 2.5 Call `logPlaybackTransition("RESUME", party)` at the top of `resumePlayback`

## 3. Verify

- [x] 3.1 Add/extend a `SpotifyMusicProvider` test asserting the helper does not throw when the device snapshot fails and does not alter the operation's response/state
- [x] 3.2 Run `./mvnw test` in `musicvoting/backend` and confirm green
- [ ] 3.3 Manually exercise start → next → pause → resume on a live party and confirm each log line shows queue, current, next, and device-loaded track
