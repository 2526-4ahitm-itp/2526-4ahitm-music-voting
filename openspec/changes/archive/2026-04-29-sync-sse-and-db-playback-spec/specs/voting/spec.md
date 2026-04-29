# Δ voting/spec.md

## Update "Live Like Updates" requirement

Replace the last sentence ("When a like is added or removed, the updated count MUST propagate to all connected clients promptly…") with:

When a like is added or removed, the backend MUST emit a `vote-updated` SSE event scoped to the party. Every client that shows vote counts (the dashboard/TV, the host dashboard, and the guest voting view) MUST subscribe to this event and reload the queue on receipt so that like counts and sort order stay consistent across devices without polling.

### Updated scenario

#### Scenario: Live update on all clients
- GIVEN guest A, guest B, the host dashboard, and the TV dashboard are all viewing the queue
- WHEN guest A likes song X
- THEN the backend emits `vote-updated` on the party SSE stream
- AND guest B's voting view, the host dashboard, and the TV dashboard each reload the queue
- AND song X's like count increases by one on every client
- AND the queue re-sorts if the new count changes the order
