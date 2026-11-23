# Spec Delta

## ADDED Requirements

### Requirement: Spotify Player Endpoints Require the Host PIN
The endpoints only the TV player needs MUST require the host PIN like every host-only endpoint: `GET /api/party/{id}/spotify/token` (the host's Spotify access token), `GET /api/party/{id}/spotify/deviceId` and `PUT /api/party/{id}/spotify/deviceId` (the playback device). Without an `Authorization` header the server MUST answer 401, with a wrong host PIN 403. A guest MUST NOT be able to obtain the host's provider token or change the playback device.

#### Scenario: Guest requests the host's Spotify token
- **GIVEN** an active party
- **WHEN** `GET /api/party/{id}/spotify/token` is called without an `Authorization` header
- **THEN** HTTP 401 is returned
- **AND** no token is included in the response

#### Scenario: Guest tries to change the playback device
- **GIVEN** an active party whose TV player is the playback device
- **WHEN** `PUT /api/party/{id}/spotify/deviceId` is called with a wrong host PIN
- **THEN** HTTP 403 is returned
- **AND** the playback device stays unchanged

#### Scenario: TV player works with the host PIN
- **GIVEN** the TV player runs on a device where the host PIN is stored
- **WHEN** it requests the token and registers its device id with `Authorization: Bearer <hostPin>`
- **THEN** both requests succeed as before
