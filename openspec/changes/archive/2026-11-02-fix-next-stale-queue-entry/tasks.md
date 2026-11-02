# Tasks: fix-next-stale-queue-entry

## 1. Backend

- [x] 1.1 Add `deleteQueueEntryIfPresent(UUID)` to `SpotifyMusicProvider` (bulk `QueueEntry.delete("id", …)`, comment why not `deleteById`) and use it at both delete sites in `playNextAndRemove`; verify with 1.2
- [x] 1.2 Tests in `SpotifyMusicProviderTest`: row already deleted while the entity is still loaded → no `StaleStateException` at flush; existing row → removed. Verify the first test fails with the old `deleteById` and passes with the fix
- [x] 1.3 Run the full backend suite; verify it is green (178/178)

## 2. Integration check

- [x] 2.1 Manual: play a party, press skip right when a song ends; verify no `StaleStateException` in the Quarkus log and the next song plays
