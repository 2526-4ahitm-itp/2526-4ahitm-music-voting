# Δ queue/spec.md

## Add new requirement after "Songs Removed on Completion or Skip"

### Requirement: Live Queue Updates via SSE
The backend MUST emit a `queue-updated` SSE event scoped to the party whenever a song is added to or removed from the queue. All connected clients that display the queue MUST reload it on receipt of this event so that the displayed queue stays consistent without relying on polling alone.

#### Scenario: Guest adds a song — all views update immediately
- GIVEN the host dashboard, the TV dashboard, and a guest voting view are all open
- WHEN a guest adds a new song
- THEN the backend emits `queue-updated` on the party SSE stream
- AND the host dashboard, TV dashboard, and guest voting view each reload the queue
- AND the new song appears in all views without any manual refresh

#### Scenario: Host removes a song — all views update immediately
- GIVEN the host removes a song from the queue on the host dashboard
- WHEN the removal succeeds
- THEN the backend emits `queue-updated` on the party SSE stream
- AND the removed song disappears from all connected views immediately
