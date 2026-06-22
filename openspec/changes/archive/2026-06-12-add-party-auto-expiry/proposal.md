# Proposal: Auto-End and Auto-Delete Stale Parties

## Intent

Parties that a host forgets to end stay active indefinitely: they keep occupying a PIN slot, keep their Spotify tokens around, and accumulate rows in the database forever. To keep PIN slots free and the database tidy, parties should automatically end after a reasonable inactivity period, and old ended parties should eventually be purged entirely.

## Scope

In scope:
- A scheduled job that ends any party still active (`ended_at IS NULL`) more than 2 days after `created_at`, using the same effects as the existing "Host Ends Party" flow (empty queue, clear provider tokens, set `endedAt`, broadcast `party-ended` SSE, remove from the in-memory registry)
- A scheduled job that permanently deletes party rows (and cascading `queue_entry`/`vote` rows) where `ended_at` is more than 1 month in the past

Out of scope:
- Making the 2-day / 1-month durations configurable via UI
- Warning/notifying hosts before auto-end
- Any change to the manual "End party" flow's behavior or API

## Approach

The existing end-party logic in `PartyResource.end()` is extracted into a shared method so it can be reused by both the host-triggered `DELETE /api/party/{id}` endpoint and a new `@Scheduled` job that periodically finds and ends stale parties. A second `@Scheduled` job periodically hard-deletes `PartyEntity` rows whose `endedAt` is older than one month; the `ON DELETE CASCADE` foreign keys already in `setup.sql` remove dependent `queue_entry` and `vote` rows.
