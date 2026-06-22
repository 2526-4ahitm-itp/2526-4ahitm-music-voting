# Tasks

## 1. Extract shared end-party logic
- [x] 1.1 Create `PartyService` with `endParty(PartyId)`, moving the body of `PartyResource.end()` (delete queue entries, clear Spotify token, set `endedAt`, remove from `PartyRegistry`, emit `party-ended` event)
- [x] 1.2 Make `endParty` tolerant of parties not present in `PartyRegistry` (skip registry/credential cleanup, still persist `endedAt` and emit the event)
- [x] 1.3 Update `PartyResource.end()` to call `PartyService.endParty(...)` after the `@HostOnly` check

## 2. Auto-end scheduled job
- [x] 2.1 Add `PartyExpiryScheduler` with an `@Scheduled(every = "1h")` job that queries `PartyEntity` where `endedAt IS NULL AND createdAt < now() - 2 days`
- [x] 2.2 For each match, call `PartyService.endParty(...)`

## 3. Auto-delete scheduled job
- [x] 3.1 Add a second `@Scheduled(every = "1h")` job that deletes `PartyEntity` rows where `endedAt IS NOT NULL AND endedAt < now() - 1 month`
- [x] 3.2 Confirm cascading deletes of `queue_entry`/`vote` rely on existing `ON DELETE CASCADE` FKs (no extra code needed)

## 4. Tests & verification
- [x] 4.1 Test: party older than 2 days with `endedAt IS NULL` gets auto-ended with full effects (queue emptied, token cleared, SSE event)
- [x] 4.2 Test: party newer than 2 days is left untouched
- [x] 4.3 Test: party ended more than 1 month ago is deleted, including cascading rows
- [x] 4.4 Test: party ended less than 1 month ago is retained
