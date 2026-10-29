## MODIFIED Requirements

### Requirement: Per-Guest Add Rate Limit
A guest MUST NOT be able to add more than 10 songs per rolling minute. Exceeding the limit MUST be rejected with a user-visible message. Guests are identified by their `deviceId`, which the client sends as the `deviceId` query parameter of `POST /api/party/{partyId}/track/addToPlaylist`. The backend MUST count added songs per party and `deviceId` over the last 60 seconds and MUST reject a request that would exceed 10 with HTTP 429 and the body `{"error":"Zu viele Anfragen — bitte kurz warten."}`. Requests without a `deviceId` (host search, older clients) MUST NOT be rate-limited. The web guest view MUST send its `deviceId` with every add.

#### Scenario: Guest is rate-limited after 10 adds
- GIVEN a guest who has added 10 songs within the last minute
- WHEN the guest attempts to add an 11th song
- THEN the request is rejected
- AND the guest sees a message such as "Zu viele Anfragen — bitte kurz warten."

#### Scenario: Limit is per guest
- GIVEN guest A has added 10 songs within the last minute
- WHEN guest B (different deviceId) adds a song
- THEN guest B's song is added

#### Scenario: Window rolls over
- GIVEN a guest added 10 songs more than 60 seconds ago
- WHEN the guest adds another song
- THEN the song is added

#### Scenario: Host adds are not limited
- GIVEN the host adds songs from the host search without a deviceId
- WHEN the host adds an 11th song within a minute
- THEN the song is added

## ADDED Requirements

### Requirement: Guest Views Receive Their Party's Live Events
Both web guest views (`/voting` and `/guest`) MUST open the live event stream with their party ID (`/api/spotify/events?source=web&partyId={id}`), so `queue-updated` and `party-ended` events of their own party reach them.

#### Scenario: Add view subscribes with its party
- GIVEN a guest of party P opens `/guest`
- WHEN the view connects to the live event stream
- THEN the request URL contains `partyId=P`
