# Proposal: Implement Voting

## Intent
Guests need to be able to like songs in the queue so the queue sorts itself by popularity. This is the core differentiator of MusicVoting: the crowd decides the order democratically. The feature was specified in `voting/spec.md` and `queue/spec.md` but had no working implementation.

## Scope
In scope:
- One like per guest per song, enforced server-side via `deviceId` unique constraint
- Toggle (like/unlike) via `POST /party/{id}/track/vote`
- Queue sorted by vote count descending, FIFO tie-break — returned by `GET /party/{id}/track/queue`
- `hasVoted` flag per track returned when client passes `?deviceId=` to the queue endpoint
- Live updates via `vote-updated` SSE event to all connected clients
- Persistent `deviceId` in web (localStorage + cookie fallback) and iOS (UserDefaults)
- Full implementation across backend (Quarkus), web frontend (Angular), and iOS app (SwiftUI)

Out of scope:
- Server-side identity verification (no accounts, no auth on vote endpoint)
- Cross-browser identity linking on the same device (different browsers are independent identities)
- Vote history or analytics

## Approach
The `vote` DB table (with a unique constraint on `queue_entry_id, device_id`) enforces one vote per device at the database level. The backend exposes a toggle endpoint that adds or removes the vote row and emits a `vote-updated` SSE event. The queue endpoint accepts an optional `deviceId` query param that activates a device-aware SQL query returning `hasVoted` per track. Clients generate a persistent UUID as their `deviceId` (localStorage + cookie on web; `UserDefaults` on iOS) and pass it on every queue fetch and vote request.
