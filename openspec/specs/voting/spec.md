# Voting Specification

## Purpose

Defines the like mechanism: one vote per guest per song, toggleable, with live updates across all clients. Votes drive the queue order (see `queue/spec.md`).

## Requirements

### Requirement: One Like per Guest per Song
A guest MUST NOT contribute more than one like to the same song at the same time. Repeated like actions on the same song MUST NOT increase the count beyond one per guest.

#### Scenario: Double-tap produces only one like
- GIVEN a guest has not yet liked song X
- WHEN the guest triggers "like" twice in quick succession on song X
- THEN song X's like count increases by exactly one for this guest

### Requirement: Likes Are Togglable
A guest MUST be able to remove their own like on a song. Toggling MUST be the documented way to undo a like.

#### Scenario: Guest unlikes a previously liked song
- GIVEN a guest who has liked song X
- WHEN the guest taps "like" on song X again
- THEN the guest's like on song X is removed
- AND song X's like count decreases by one

### Requirement: Live Like Updates
When a like is added or removed, the updated count MUST propagate to all connected clients promptly, so that queue ordering stays consistent across devices.

#### Scenario: Live update on all clients
- GIVEN guest A, guest B, the host, and the dashboard are all viewing the queue
- WHEN guest A likes song X
- THEN guest B, the host, and the dashboard all see song X's like count increase
- AND the queue re-sorts on every client if the new count changes the order
