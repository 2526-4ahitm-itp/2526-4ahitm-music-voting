# Δ dashboard/spec.md

## Update "Persistent Dashboard Elements" requirement

Add the following scenario:

#### Scenario: Dashboard queue and now-playing update without reload
- GIVEN the TV dashboard is open and displaying the queue and current track
- WHEN a guest adds a song, a guest votes, or the host skips to the next song
- THEN the dashboard updates its queue or current-track display within a few seconds
- AND no manual page reload is required

## Add new requirement: Live Updates via SSE

### Requirement: Dashboard Subscribes to SSE for Live Updates
The TV dashboard MUST maintain a persistent SSE connection to `/api/spotify/events?source=web&partyId={id}`. It MUST react to the following events:

| Event | Action |
|---|---|
| `queue-updated` | Reload queue from `GET /track/queue` |
| `vote-updated` | Reload queue (to refresh like counts and sort order) |
| `track-changed` | Reload current track from `GET /track/current` and reload queue |
| `party-ended` | Navigate to home page |

The dashboard MUST NOT rely exclusively on polling for any of the above state changes; SSE MUST be the primary update path.
