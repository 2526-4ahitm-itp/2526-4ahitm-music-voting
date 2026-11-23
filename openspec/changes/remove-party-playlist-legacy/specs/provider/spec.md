# Spec Delta

## ADDED Requirements

### Requirement: System Does Not Create or Modify Playlists in the Host's Account
The system MUST NOT create, rename, fill or otherwise modify playlists in the host's provider account. It MAY only read the host's playlists (to offer a default playlist and to refill the queue). The provider OAuth flow MUST request only the permissions needed for playback and for reading playlists; for Spotify it MUST NOT request `playlist-modify-private` or `playlist-modify-public`.

#### Scenario: Host logs in without a default playlist
- **GIVEN** a host whose Spotify account has no playlist named "Musicvoting party"
- **WHEN** the host completes the Spotify login for a party (web or iOS)
- **THEN** no playlist is created in the host's Spotify account
- **AND** the host's existing playlists are unchanged

#### Scenario: Queue is refilled without a default playlist
- **GIVEN** a party without a default playlist whose last queued song is playing
- **WHEN** the system refills the queue
- **THEN** no playlist is created or looked up by name in the host's account
- **AND** the refill continues with similar songs → Top-Charts → search as defined in "Similar-Songs Refill Falls Back When Unavailable"

#### Scenario: OAuth consent asks only for needed permissions
- **WHEN** the host is redirected to Spotify's OAuth consent screen
- **THEN** the requested scopes include `playlist-read-private`
- **AND** they do not include `playlist-modify-private` or `playlist-modify-public`
