# Delta for Playback

## ADDED Requirements

### Requirement: Playback Device Availability Exposed to Clients
`GET /party/{id}/track/current` MUST include a `deviceActive` boolean field. For Spotify parties, `deviceActive` MUST be `true` if and only if a non-blank Spotify playback device ID is currently registered for the party (`SpotifyCredentials.getDeviceId()`). For parties using a provider without a device concept, `deviceActive` MUST be `true`.

#### Scenario: No device registered yet
- GIVEN a Spotify party where the dashboard/startpage has never been opened
- WHEN any client calls `GET /party/{id}/track/current`
- THEN the response includes `"deviceActive": false`

#### Scenario: Device registered
- GIVEN the dashboard/startpage has opened and registered a Spotify Web Playback SDK device for the party
- WHEN any client calls `GET /party/{id}/track/current`
- THEN the response includes `"deviceActive": true`
