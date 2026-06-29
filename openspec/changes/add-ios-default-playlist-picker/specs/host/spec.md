# Delta spec — host/spec.md

## Add after the existing "iOS Host Controls Include Authorization Header" requirement

### Requirement: iOS Host Picks a Default Playlist After Spotify Auth
After Spotify authentication succeeds on iOS, the app MUST navigate to a playlist picker before opening the admin dashboard. The picker MUST list the host's Spotify playlists (fetched from `GET /api/party/{id}/spotify/playlists`) and offer a prominent "Ohne Standard-Playlist fortfahren" skip action. Selecting a playlist MUST call `PUT /api/party/{id}/default-playlist`; skipping MUST NOT call that endpoint. Both paths MUST then navigate to the admin dashboard.

The skip action MUST remain enabled at all times — a network error loading playlists MUST NOT prevent the host from reaching the admin dashboard.

#### Scenario: Host picks a playlist
- GIVEN the host has completed Spotify auth on iOS
- WHEN the playlist picker opens and the host taps a playlist
- THEN `PUT /api/party/{id}/default-playlist` is called with the chosen playlist ID
- AND the host is navigated to the admin dashboard
- AND auto-refill for this party will draw from the chosen playlist

#### Scenario: Host skips playlist selection
- GIVEN the host has completed Spotify auth on iOS
- WHEN the host taps "Ohne Standard-Playlist fortfahren"
- THEN no default-playlist endpoint is called
- AND the host is navigated to the admin dashboard
- AND auto-refill falls back to Spotify recommendations or Top-Charts

#### Scenario: Playlist load fails — skip still works
- GIVEN the playlist picker opens but `GET /api/party/{id}/spotify/playlists` returns an error
- WHEN the error banner is shown
- THEN the skip action is still visible and tappable
- AND tapping skip navigates to the admin dashboard without calling the default-playlist endpoint
