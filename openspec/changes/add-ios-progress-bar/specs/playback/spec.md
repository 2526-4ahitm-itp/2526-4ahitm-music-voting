# Δ playback/spec.md

## MODIFIED Requirements

### Requirement: Cross-Client Playback Progress Relay
The TV player owns the Spotify Web Playback SDK and is the only real source of track position. It MUST publish its position so other clients of the same party can mirror it, reusing the existing SSE event bus (no WebSocket).

- The player MUST `POST /party/{id}/track/progress` with `{position, duration, paused}` about once per second while a track is loaded.
- The backend MUST re-broadcast each call as a `progress` SSE event scoped to the party. The payload carries `position`, `duration`, and `paused` (as strings) plus `source=web` and `partyId`.
- The `/spotify/events` stream MUST deliver `progress` events only to clients whose `partyId` matches, regardless of the client `source`:
  - The **web** branch delivers party-scoped events (`progress`, `queue-updated`, `track-changed`, `vote-updated`) to clients whose `partyId` matches.
  - The **iOS** branch MUST deliver the same party-scoped events to a client whose `partyId` matches, in addition to the events it already receives (`party-ended` and events targeted by `installationId`). An iOS client therefore MUST supply `partyId` on the `/spotify/events` query.
- `POST /track/progress` is best-effort: it MUST NOT mutate playback or call Spotify, and a failure MUST NOT disrupt playback.

#### Scenario: Host client mirrors the player position
- GIVEN the TV player is playing song X at 1:12
- WHEN the player publishes its position
- THEN a `progress` event is broadcast to the party's web SSE subscribers
- AND the host control client updates its progress bar to ≈ 1:12 within ~1 s
- AND no Spotify API call is made for this update

#### Scenario: iOS client receives party-scoped progress events
- GIVEN an iOS host admin view is subscribed to `/spotify/events` with `source=ios` and the party's `partyId`
- WHEN the TV player publishes its position for that party
- THEN the `progress` event is delivered to the iOS subscriber
- AND `progress` events for a different party are NOT delivered to it
