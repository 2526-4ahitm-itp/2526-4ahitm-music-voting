## ADDED Requirements

### Requirement: Auto-Advance Starts the Next Track on the Active Device

When the current track ends and the backend advances (`/track/next`), the next track MUST actually begin playing on the party's active playback device (the registered Web Playback SDK device) **without requiring the host to press Play**. A `2xx` from `PUT /me/player/play` that does not result in the device switching tracks MUST NOT leave playback paused on the finished song.

Because the advance is issued in the end-of-track transition window — where the just-idled SDK device sometimes accepts the play (`2xx`) without actually switching tracks, and Spotify's server-side playback state lags — the backend MUST, after the play is accepted, **re-assert the exact next track uri** to the resolved device (a best-effort second `PUT /me/player/play {uris:[next], position_ms:…}` after a short settle delay) so the play lands once the device is ready. The re-assert:
- MUST name the **same** next track uri (carrying `position_ms` so a play that already took continues seamlessly rather than restarting), so it can only ever (re)play the correct song;
- MUST NOT transfer/activate the device (`PUT /me/player {device_ids:…, play:true}`) as the recovery mechanism — a transfer resumes whatever context the account currently holds and can start the *previous* track or a stale cross-party track;
- MUST be best-effort and MUST NOT gate the `2xx` commit.

The advance MUST continue to commit `currentlyPlayingEntryId` on the `2xx` (per "Advance Commits on Play Acceptance"); this requirement is about the *device actually starting the next track*, not about gating the commit.

#### Scenario: Track ends and the next song starts automatically
- **GIVEN** song A is playing on the party's SDK device and song B is next
- **WHEN** song A ends and the backend advances to song B
- **THEN** song B begins playing on the SDK device without any manual Play
- **AND** `currentlyPlayingEntryId` is song B

#### Scenario: A play that 2xx's without switching the just-idled device is re-asserted
- **GIVEN** song A has just ended and the SDK device is momentarily idle
- **WHEN** the backend advances to song B and the first play is accepted but does not switch the device
- **THEN** the backend re-asserts song B's exact uri to the resolved device after a short settle delay
- **AND** playback does not remain paused on the finished song A

#### Scenario: Recovery never plays the wrong song
- **GIVEN** the account's current playback context holds a stale track (e.g. left over from a prior party or session)
- **WHEN** the backend advances to song B
- **THEN** the recovery re-issues song B's own uri (never a device transfer that would resume the stale context)
- **AND** the device never starts a track other than song B

### Requirement: Device-Resolution Diagnostics on Advance

The advance/play path MUST emit, via the existing `io.quarkus.logging.Log` diagnostic logging, the **resolved playback device id** and a snapshot of `GET /me/player/devices` (each device's `id`, `is_active`, and `name`) at the moment it starts the next track. Gathering this MUST be best-effort and MUST NOT change the outcome of the advance.

#### Scenario: Advance logs the resolved device and available devices
- **WHEN** the backend advances to the next song
- **THEN** a diagnostic log line records the resolved device id used for the play call
- **AND** it lists the devices Spotify currently reports, each with its `id`, `is_active`, and `name`
- **AND** a failure to read the device list still lets the advance complete normally
