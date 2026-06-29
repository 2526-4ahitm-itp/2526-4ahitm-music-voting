# Δ host/spec.md

## ADDED Requirements

### Requirement: Host Spotify Session Survives a Backend Restart
The host's Spotify authorization MUST survive a backend restart. The party's Spotify **refresh token** MUST be persisted on the party's database row when it is obtained at OAuth and whenever Spotify rotates it. When the party is reconstructed from the database, the refresh token MUST be loaded back into its credentials, and the system MUST be able to mint a new access token from it without the host re-authenticating.

A party that has a stored refresh token (but no current access token, e.g. right after a restart) MUST be reported as logged in, and a request for the host access token MUST return a freshly refreshed, valid token.

#### Scenario: Host stays logged in across a restart
- GIVEN a host authenticated a party with Spotify
- AND the backend restarts (losing in-memory state)
- WHEN the party is reconstructed from the database
- THEN its Spotify refresh token is restored from the database row
- AND the host is reported as logged in without re-authenticating

#### Scenario: Access token is re-minted after a restart
- GIVEN a reconstructed party that has a refresh token but no current access token
- WHEN the host's access token is requested
- THEN a new access token is obtained from the refresh token
- AND the request returns a valid access token

#### Scenario: Refresh token persists across rotation
- GIVEN a party whose access token is refreshed
- AND Spotify returns a new refresh token during the refresh
- THEN the new refresh token is persisted on the party row
