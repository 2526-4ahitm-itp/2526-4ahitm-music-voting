# Δ playback/spec.md

## RENAMED Requirements
- FROM: `### Requirement: Device Re-registration Resets Progress`
- TO: `### Requirement: Device Re-registration Resumes At Current Position`

## MODIFIED Requirements

### Requirement: Device Re-registration Resumes At Current Position
Registering a new Web Playback SDK device MUST NOT rewind the current track to 0:00. When the TV/startpage browser registers a new device via `PUT /party/{id}/spotify/deviceId`, the backend (`restoreCurrentTrackOnDevice`) MUST:
1. Compute the current position from the party's elapsed-progress model — `pausedPositionMs` if paused, else `now() − playbackStartedAt`.
2. Play the current/last track on the new device with `position_ms` set to that position, so playback resumes where it was instead of restarting at 0:00. When the position is 0, `position_ms` MAY be omitted.
3. On success, write `playbackStartedAt = now() − position` and `pausedPositionMs = null`, so `GET /track/current` stays consistent with the resumed position.
4. Emit a `track-changed` SSE event so all clients reload their current-track state.

If another device is already actively playing the party, the backend MUST NOT re-issue play; it only refreshes its cached playback (unchanged from before).

#### Scenario: Opening the player keeps the current position
- GIVEN song X has been playing for 30 s
- WHEN the TV browser opens or reloads the startpage and registers a new device
- THEN the backend resumes song X at ≈ 0:30 on the new device (not 0:00)
- AND `playbackStartedAt` is set to `now() − 30 s`
- AND a `track-changed` SSE event is emitted

## ADDED Requirements

### Requirement: Cross-Client Playback Progress Relay
The TV player owns the Spotify Web Playback SDK and is the only real source of track position. It MUST publish its position so other clients of the same party can mirror it, reusing the existing SSE event bus (no WebSocket).

- The player MUST `POST /party/{id}/track/progress` with `{position, duration, paused}` about once per second while a track is loaded.
- The backend MUST re-broadcast each call as a `progress` SSE event scoped to the party. The payload carries `position`, `duration`, and `paused` (as strings) plus `source=web` and `partyId`.
- The `/spotify/events` web stream MUST deliver `progress` events only to clients whose `partyId` matches.
- `POST /track/progress` is best-effort: it MUST NOT mutate playback or call Spotify, and a failure MUST NOT disrupt playback.

#### Scenario: Host client mirrors the player position
- GIVEN the TV player is playing song X at 1:12
- WHEN the player publishes its position
- THEN a `progress` event is broadcast to the party's web SSE subscribers
- AND the host control client updates its progress bar to ≈ 1:12 within ~1 s
- AND no Spotify API call is made for this update
