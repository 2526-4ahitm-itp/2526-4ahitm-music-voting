# Delta for Host

## ADDED Requirements

### Requirement: Play Controls Locked Without Active Playback Device
The web host-dashboard and the iOS admin dashboard MUST disable Play/Pause/Skip controls while `deviceActive` (from `GET /party/{id}/track/current`) is `false`, and MUST show a short hint explaining that the dashboard/startpage needs to be opened first. Controls MUST become interactive again as soon as `deviceActive` becomes `true`, without requiring a page reload or app restart.

#### Scenario: Host opens dashboard before startpage
- GIVEN the host opens the web host-dashboard before any startpage/TV has registered a playback device
- WHEN the dashboard loads
- THEN Play/Pause/Skip are shown disabled
- AND a hint is shown explaining that the player needs to be opened

#### Scenario: Controls unlock once device registers
- GIVEN the host-dashboard shows Play/Pause/Skip disabled because no device is active
- WHEN the TV/startpage opens and registers a Spotify Web Playback SDK device
- THEN the host-dashboard's Play/Pause/Skip controls become enabled without a reload

#### Scenario: iOS admin view reflects the same lock
- GIVEN a Spotify party with no active playback device
- WHEN the host opens the iOS admin dashboard
- THEN Play/Pause/Skip are shown disabled with the same hint as the web dashboard
