# Proposal: Fix Party-Ended Propagation to iOS Clients

## Intent
When a host ends a party — from either the web dashboard or the iOS app — every connected guest view must immediately react and show "Die Party ist beendet." The web frontend already handles this correctly end-to-end. The iOS app has two gaps: the host exit never sends `DELETE /api/party/{id}` (so the backend never emits the `party-ended` SSE event), and the iOS guest/admin views have no SSE listener at all.

## Scope
In scope:
- iOS: `ExitView.handleAdminExit()` calls `partySession.endParty()` so the `DELETE` request reaches the backend
- iOS: `Gast_ContentView` opens an SSE connection and reacts to `party-ended` by showing "Die Party ist beendet." and returning to the start screen
- iOS: `Admin_ContentView` opens an SSE connection and reacts to `party-ended` (e.g. party ended from the web dashboard while iOS admin is open) by returning to the start screen

Out of scope:
- Web frontend changes (already fully implemented)
- Backend SSE endpoint changes (already correct)
- Handling other SSE events (queue-updated, vote-updated, track-changed) in iOS guest/admin — separate feature

## Approach
1. Make `handleAdminExit()` async (via `Task`) and call `partySession.endParty()` before clearing and navigating.
2. Add a `partyEndedSSETask` in `Gast_ContentView` and `Admin_ContentView` that opens an SSE stream to `/api/spotify/events?source=ios&partyId={id}`, reads lines, and fires when a `party-ended` data line is received. On receipt: call `partySession.clear()` and set `appState.currentSite = .start`. For the guest view, show an alert "Die Party ist beendet." before dismissing.
3. Cancel the SSE task in `onDisappear`.
