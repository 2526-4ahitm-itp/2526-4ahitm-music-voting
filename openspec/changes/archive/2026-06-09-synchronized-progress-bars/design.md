# Design

## Decisions

### Reuse the SSE event bus, not WebSockets
The repo has no WebSocket anywhere; the only real-time channel is the SSE `LoginEventBus` (`/spotify/events`), to which the host client is already subscribed. Position sync needs both directions — player → backend (publish) and backend → host (subscribe). Rather than add `quarkus-websockets-next` and a second real-time mechanism, the player publishes via a lightweight `POST /track/progress` and the backend re-broadcasts on the existing bus. Zero new dependencies.

### Source of truth = the SDK-owning player
Only `/startpage` runs the Web Playback SDK, so only it knows the true position. It is the sole publisher; every other client mirrors. The host client therefore needs no Spotify polling for its bar.

### Resume at the tracked position on device handoff
The 30 s rewind came from replaying at position 0 when a new SDK device registered. The party already tracks position via `playbackStartedAt` / `pausedPositionMs` (the same model `/track/current` uses), so the handoff now passes `position_ms` and sets `playbackStartedAt = now() − position`, mirroring `resume()`. This supersedes the prior "reset to 0:00 on reload" behavior.

## Terminology (code ↔ spec domain)
- **TV player** = `/startpage` (Startpage) = OpenSpec **dashboard** domain (audio view, no controls).
- **Host control client** = `/dashboard` (HostDashboard) = OpenSpec **host** domain.

## Risk / not verified here
The SDK position read (`getCurrentState`) and the `position_ms` resume call hit live Spotify and cannot be exercised in CI; they require a manual Premium test (tasks 5.3).
