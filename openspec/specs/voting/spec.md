# Voting Specification

## Purpose

Defines the like mechanism: one vote per guest per song, toggleable, with live updates across all clients. Votes drive the queue order (see `queue/spec.md`).

## Requirements

### Requirement: One Like per Guest per Song
The one-like-per-guest constraint MUST be enforced server-side using a `deviceId` supplied by the client. The database MUST reject a second vote from the same `deviceId` for the same song via a unique constraint on `(queue_entry_id, device_id)`. The frontend MUST include the `deviceId` in every vote request.

#### Scenario: Double-tap produces only one like
- GIVEN a guest with deviceId "abc" has not yet liked song X
- WHEN the guest triggers "like" twice in quick succession on song X
- THEN only one `vote` row exists for (song X, "abc")
- AND song X's like count is exactly one for this guest

#### Scenario: Second vote from same device is rejected
- GIVEN a guest with deviceId "abc" has already liked song X
- WHEN the client sends a second like request for song X with deviceId "abc"
- THEN the server rejects the request
- AND the like count for song X does not increase

### Requirement: Likes Are Togglable
A guest MUST be able to remove their own like by sending a toggle request with their `deviceId`. The server MUST delete the `vote` row for `(queue_entry_id, device_id)` when toggling off.

#### Scenario: Guest unlikes a previously liked song
- GIVEN a guest with deviceId "abc" has liked song X
- WHEN the guest sends a toggle-like request for song X with deviceId "abc"
- THEN the `vote` row for (song X, "abc") is deleted
- AND song X's like count decreases by one

### Requirement: Live Like Updates
When a like is added or removed, the backend MUST emit a `vote-updated` SSE event scoped to the party. Every client that shows vote counts (the TV dashboard, the host dashboard, and the guest voting view) MUST subscribe to this event and reload the queue on receipt so that like counts and sort order stay consistent across devices without polling.

#### Scenario: Live update on all clients
- GIVEN guest A, guest B, the host dashboard, and the TV dashboard are all viewing the queue
- WHEN guest A likes song X
- THEN the backend emits `vote-updated` on the party SSE stream
- AND guest B's voting view, the host dashboard, and the TV dashboard each reload the queue
- AND song X's like count increases by one on every client
- AND the queue re-sorts if the new count changes the order
