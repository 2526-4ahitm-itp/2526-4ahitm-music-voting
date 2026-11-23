## ADDED Requirements

### Requirement: Web Playback Device Keeps a Valid Spotify Token

The Spotify Web Playback SDK player on `/startpage` MUST fetch its access token from `GET /party/{id}/spotify/token` each time the SDK requests one (`getOAuthToken`), instead of reusing the token from player start, so playback survives the 60-minute token lifetime without a reload. If that request fails or returns an empty token, the SDK MUST receive the last known token.

#### Scenario: Playback continues after the access token expires
- **GIVEN** a party whose startpage player has been playing for more than 60 minutes
- **WHEN** the Spotify SDK requests a new token
- **THEN** the player fetches the current token from `GET /party/{id}/spotify/token`
- **AND** hands that new token to the SDK
- **AND** playback continues without reloading the startpage

#### Scenario: Token request fails
- **GIVEN** the startpage player has a previously fetched token
- **WHEN** the SDK requests a token and `GET /party/{id}/spotify/token` fails or returns an empty body
- **THEN** the SDK receives the previously fetched token
