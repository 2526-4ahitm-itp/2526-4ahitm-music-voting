## 1. Diagnostic logging helper

- [x] 1.1 Add a `private void logPlaybackTransition(String op, Party party)` helper to `SpotifyMusicProvider` using `io.quarkus.logging.Log`
- [x] 1.2 In the helper render: ordered queue (`name | uri | id`), `currentlyPlayingEntryId`'s track, the computed next song (first entry whose id ≠ current; "none" if absent), and a best-effort `getCurrentPlaybackSnapshot` device uri + `is_playing` ("unavailable" on failure)
- [x] 1.3 Call the helper at the top of `startFirstSongWithoutRemoving`, `playNextAndRemove`, `play`, `pausePlayback`, and `resumePlayback`

## 2. Fix resume desync

- [x] 2.1 In `resumePlayback`, resolve the current `QueueEntry` from `PartyEntity.currentlyPlayingEntryId`
- [x] 2.2 When a current entry exists, send `PUT /me/player/play` with `{ uris: [currentUri], position_ms: pausedPositionMs }` instead of a bare resume
- [x] 2.3 Preserve existing post-success bookkeeping (adjust `playbackStartedAt` from paused position, clear `pausedPositionMs`, set `lastPlaybackActive = true`)
- [x] 2.4 Fall back to the current bare-resume path only when there is no known current entry

## 3. Revert advance confirmation (was deployed, proven harmful by live logs)

- [x] 3.1 In `playNextAndRemove`, remove the post-play `getCurrentPlaybackSnapshot` read and the `shouldCommitAdvance` gate; commit (delete previous entry, set `currentlyPlayingEntryId`) directly on a `2xx` from `play(party, nextUri)`, as before this change
- [x] 3.2 Remove the `not-confirmed` response branch and the `previousUri` capture that only fed the gate
- [x] 3.3 Remove the now-unused `shouldCommitAdvance` helper (keep `buildResumeBody` and the logging helper)

## 4. Verify

- [x] 4.1 Unit test `resumePlayback`: when `currentlyPlayingEntryId` points to song B, the outgoing play body carries B's uri (not a bare resume)
- [x] 4.2 Unit test `resumePlayback`: no current entry falls back to bare resume without error
- [x] 4.3 Remove the `shouldCommitAdvance` matrix test (behavior reverted); keep the resume-body and logging tests
- [x] 4.4 Test that `logPlaybackTransition` does not throw and does not alter operation results when the snapshot fails
- [x] 4.5 Re-run `./mvnw test` in `musicvoting/backend` and confirm green after the revert
- [ ] 4.6 Rebuild + redeploy the backend, then live-check: 4 songs auto-advance through all four without stalling on the 3rd, and Play resumes the *displayed* song (read the `[playback …]` logs to confirm no `current`-pinned-to-finished-song)
