# Δ host/spec.md

## ADDED Requirements

### Requirement: Host Selects an Optional Default Playlist at Party Creation
After the host authenticates with Spotify while creating a party, the web host flow MUST present a playlist picker listing the host's own Spotify playlists, with an explicit option to continue without a default playlist. The chosen playlist (if any) MUST be stored as the party's default playlist and used to refill the queue when it would otherwise empty (see `playback/spec.md` "Empty Queue Behavior"). Selecting "no default playlist" MUST leave the party without one, in which case the empty-queue refill uses Spotify recommendations instead.

#### Scenario: Host picks a default playlist
- GIVEN the host has just authenticated with Spotify while creating a party
- WHEN the playlist picker loads
- THEN the host's own Spotify playlists are listed
- AND selecting one stores it as the party's default playlist
- AND the host then continues to the host dashboard

#### Scenario: Host continues without a default playlist
- GIVEN the host is on the playlist picker
- WHEN the host chooses to continue without a default playlist
- THEN the party is left with no default playlist
- AND the host continues to the host dashboard

### Requirement: List the Host's Spotify Playlists
The backend MUST expose a host-only endpoint `GET /api/party/{id}/spotify/playlists` that returns the authenticated host's Spotify playlists (at least id and name per playlist), using the existing `playlist-read-private` authorization. Requests without a valid host authorization MUST be rejected.

#### Scenario: Authorized host lists playlists
- GIVEN the host is authenticated for the party
- WHEN the host requests `GET /api/party/{id}/spotify/playlists`
- THEN the response lists the host's Spotify playlists with their ids and names

#### Scenario: Unauthorized playlist listing is rejected
- GIVEN a request without a valid host authorization for the party
- WHEN it calls `GET /api/party/{id}/spotify/playlists`
- THEN the request is rejected as not allowed

### Requirement: Set the Party Default Playlist
The backend MUST expose a host-only endpoint to set (or clear) the party's default playlist, e.g. `PUT /api/party/{id}/default-playlist` with a body identifying the chosen playlist, or clearing it. The stored value MUST persist on the party and survive a backend restart.

#### Scenario: Host sets the default playlist
- GIVEN the host is authenticated for the party
- WHEN the host sets the default playlist to a chosen playlist id
- THEN the party stores that playlist id as its default playlist
- AND a later empty-queue refill draws from that playlist
