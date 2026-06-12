# Design: Auto-End and Auto-Delete Stale Parties

## Technical Approach

Two new `@Scheduled` jobs are added (Quarkus `io.quarkus.scheduler.Scheduled`), running e.g. hourly:

1. **Auto-end job**: queries `PartyEntity` where `endedAt IS NULL AND createdAt < now() - 2 days`. For each match, runs the same end-party effects as `PartyResource.end()`.
2. **Auto-delete job**: queries `PartyEntity` where `endedAt IS NOT NULL AND endedAt < now() - 1 month` and deletes those rows. `queue_entry` (and `vote` via `queue_entry`) cascade-delete per existing FK constraints.

## Architecture Decisions

### Decision: Extract `PartyService.endParty(PartyId)` shared by API and scheduler
`PartyResource.end()`'s body (delete queue entries, clear Spotify token if present, set `endedAt`, remove from `PartyRegistry`, emit `party-ended` LoginEvent) moves into a new `PartyService` bean. `PartyResource.end()` becomes a thin wrapper that calls this method after the `@HostOnly` check. The scheduled auto-end job calls the same method directly. Because:
- Guarantees auto-end has identical observable effects (SSE event, token cleanup, queue emptying) to a manual end, as required by the proposal
- Avoids duplicating the multi-step end logic
Alternatives considered: duplicating the logic in the scheduled job — rejected, drifts over time.

The shared method tolerates parties that are not present in `PartyRegistry` (e.g. after a backend restart): it still sets `endedAt` and emits `party-ended`, but skips `partyRegistry.remove(...)`/credential cleanup when the party isn't registered in memory.

### Decision: Hourly schedule via `@Scheduled(every = "1h")`
A 1-hour granularity is precise enough for 2-day/1-month thresholds and avoids tight polling. Alternatives considered: cron at midnight — less responsive without real benefit here.

### Decision: Hard delete relies on existing `ON DELETE CASCADE`
`setup.sql` already defines `queue_entry.party_id REFERENCES party(id) ON DELETE CASCADE` and `vote.queue_entry_id REFERENCES queue_entry(id) ON DELETE CASCADE`, so deleting the `party` row is sufficient — no manual cleanup of dependent tables needed.

## File Changes
- `musicvoting/backend/src/main/java/at/htl/service/PartyService.java` (new — shared `endParty`/cleanup logic)
- `musicvoting/backend/src/main/java/at/htl/endpoints/PartyResource.java` (modified — delegate `end()` to `PartyService`)
- `musicvoting/backend/src/main/java/at/htl/scheduler/PartyExpiryScheduler.java` (new — the two `@Scheduled` jobs)
