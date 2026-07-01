## ADDED Requirements

### Requirement: Auto-Advance Starts the Next Track on the Active Device

When the current track ends and the backend advances (`/track/next`), the next track MUST actually begin playing on the party's active playback device (the registered Web Playback SDK device) **without requiring the host to press Play**. A `2xx` from `PUT /me/player/play` that does not result in the device switching tracks MUST NOT leave playback paused on the finished song.

Because the advance is issued in the end-of-track transition window — where the SDK device may briefly be `not_ready`/absent from `GET /me/player/devices` and Spotify's server-side playback state lags — the backend MUST ensure the intended device is the active playback target at play time (e.g. by activating/transferring playback to the resolved SDK device before playing the next uri), rather than issuing a bare play into a device that just paused.

The advance MUST continue to commit `currentlyPlayingEntryId` on the `2xx` (per "Advance Commits on Play Acceptance"); this requirement is about the *device actually starting the next track*, not about gating the commit.

#### Scenario: Track ends and the next song starts automatically
- **GIVEN** song A is playing on the party's SDK device and song B is next
- **WHEN** song A ends and the backend advances to song B
- **THEN** song B begins playing on the SDK device without any manual Play
- **AND** `currentlyPlayingEntryId` is song B

#### Scenario: SDK device transient at end-of-track does not strand playback
- **GIVEN** song A has just ended and the SDK device is momentarily `not_ready` or absent from the device list
- **WHEN** the backend advances to song B
- **THEN** the backend activates/targets the party's registered SDK device before playing song B
- **AND** playback does not remain paused on the finished song A

### Requirement: Device-Resolution Diagnostics on Advance

The advance/play path MUST emit, via the existing `io.quarkus.logging.Log` diagnostic logging, the **resolved playback device id** and a snapshot of `GET /me/player/devices` (each device's `id`, `is_active`, and `name`) at the moment it starts the next track. Gathering this MUST be best-effort and MUST NOT change the outcome of the advance.

#### Scenario: Advance logs the resolved device and available devices
- **WHEN** the backend advances to the next song
- **THEN** a diagnostic log line records the resolved device id used for the play call
- **AND** it lists the devices Spotify currently reports, each with its `id`, `is_active`, and `name`
- **AND** a failure to read the device list still lets the advance complete normally
