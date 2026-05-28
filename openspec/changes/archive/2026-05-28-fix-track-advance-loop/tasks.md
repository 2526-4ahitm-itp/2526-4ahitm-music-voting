# Tasks

## 1. Backend — skip currently playing entry in playNextAndRemove
- [x] 1.1 Move `partyEntity` fetch to the top of `playNextAndRemove`
- [x] 1.2 After calling `getQueue`, stream-filter out the entry whose ID equals `currentlyPlayingEntryId`
- [x] 1.3 If no entry remains after filtering, delete the current entry, clear `currentlyPlayingEntryId`, return empty message
- [x] 1.4 Otherwise proceed with the filtered-first entry as `nextTrack`

## 2. Frontend — guard against concurrent playNext calls
- [x] 2.1 Add `private isAdvancing = false` field to `Startpage`
- [x] 2.2 Return early in `playNext()` if `isAdvancing` is true
- [x] 2.3 Set `isAdvancing = true` at the start; clear it after 3 seconds in `finally`
