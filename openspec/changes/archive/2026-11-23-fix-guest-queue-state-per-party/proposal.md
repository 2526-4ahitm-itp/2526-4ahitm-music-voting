## Why

Live report: a guest added songs in party A on their phone. The host then started a new party B, the guest joined B in the same browser tab and wanted to add a song they had already added in A — the search showed it as „Schon in der Warteschlange“ (add button disabled), although B's queue did not contain it.

Root cause: `QueueStateService` (Angular root singleton) holds the set of queued track URIs. It loaded the queue only once at construction and afterwards only on `refresh()` (after an own add or a `queue-updated` SSE event). Joining another party in the same tab changes `PartyService.partyId$` but never reset or reloaded this set, so party A's songs stayed marked as "in the queue" in party B. The backend duplicate check is correctly party-scoped (`partyId = ?1 AND trackUri = ?2`); only the frontend state was stale.

## What Changes

- `QueueStateService` subscribes to `PartyService.partyId$`: on every party change it clears the set immediately and reloads the queue of the new party.
- A late queue response that belongs to a party the client has already left is ignored.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `guest`: the "already in the queue" marking reflects only the party the guest is currently in.

## Impact

- Code: `musicvoting/frontend/src/app/services/queue-state.ts` + `queue-state.spec.ts`. Also affects the host search (`search-host`), which uses the same service.
- No backend or API changes.
