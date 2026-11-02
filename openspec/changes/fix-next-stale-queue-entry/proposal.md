# Proposal: "Next" Must Not Fail When the Finished Entry Is Already Gone

## Why

`POST /track/next` failed in dev with `ArcUndeclaredThrowableException` (TrackResource line 184), caused by:

```
org.hibernate.StaleStateException: Unexpected row count (expected row count 1 but was 0)
  [delete from queue_entry where id=?]
```

`playNextAndRemove` removed the finished queue entry with `QueueEntry.deleteById(...)`. Panache loads the entity and deletes it at commit, expecting exactly one row. If a parallel request already deleted that row (e.g. a second "next" from song end and skip at the same moment), the commit fails, the whole advance is rolled back and the request errors, although the new song was already sent to Spotify.

## What Changes

- The finished entry is removed with a bulk delete (`QueueEntry.delete("id", …)`), which removes 0 or 1 rows without failing. This matches the other queue deletes in `SpotifyMusicProvider`. Votes still go with the entry via `ON DELETE CASCADE` in the database.
- New playback requirement: an advance must not fail because the finished entry was already removed.

## Impact

- Backend only: `SpotifyMusicProvider.playNextAndRemove` (both delete sites), new helper `deleteQueueEntryIfPresent`.
- Tests: `SpotifyMusicProviderTest` (row already gone → no error at flush; existing row → removed).
- No API, frontend or iOS change.
