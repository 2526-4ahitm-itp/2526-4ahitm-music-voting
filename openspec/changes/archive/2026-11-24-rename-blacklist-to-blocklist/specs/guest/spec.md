# Spec Delta: guest

## MODIFIED Requirements

### Requirement: Per-Guest Add Rate Limit
A guest MUST NOT be able to add more than 10 songs per rolling minute. Exceeding the limit MUST be rejected with a user-visible message. The guest is identified by their persistent `deviceId`; only songs actually added count. The host (valid host PIN) is exempt.

#### Scenario: Guest is rate-limited after 10 adds
- GIVEN a guest who has added 10 songs within the last minute
- WHEN the guest attempts to add an 11th song
- THEN the request is rejected
- AND the guest sees a message such as "Zu viele Anfragen — bitte kurz warten."

#### Scenario: Rejection carries status and wait time
- **GIVEN** a guest who has added 10 songs within the last 60 seconds
- **WHEN** the guest sends another add request with their `deviceId`
- **THEN** the backend answers HTTP 429 with the error "Zu viele Anfragen — bitte kurz warten."
- **AND** includes `retryAfterSeconds`, the seconds until the oldest of those adds leaves the window

#### Scenario: Window rolls forward
- **GIVEN** a guest added 10 songs, the first of them 61 seconds ago
- **WHEN** the guest adds another song
- **THEN** the song is added

#### Scenario: Rejected adds do not count
- **GIVEN** a guest whose add is rejected because the song is already queued or blocklisted
- **WHEN** the guest adds other songs afterwards
- **THEN** the rejected attempt does not count towards the 10 songs

#### Scenario: Limit is per guest and per party
- **GIVEN** guest A has reached the limit
- **WHEN** guest B of the same party adds a song
- **THEN** guest B's song is added

#### Scenario: Host is not limited
- **GIVEN** the host sends add requests with a valid host PIN
- **WHEN** the host adds more than 10 songs within a minute
- **THEN** every song is added

### Requirement: Blocked Search Results Stay Discreet
A blocked search result keeps the behaviour of `search/spec.md` (greyed out, no visible text). Its disabled "+" MUST have the `aria-label` and tooltip "Nicht verfügbar", without revealing the reason.

#### Scenario: Blocked result explains itself without a reason
- GIVEN song X is blocked by the party blocklist
- WHEN a guest focuses or hovers the disabled "+" of song X in the search results
- THEN "Nicht verfügbar" is announced or shown as a tooltip
- AND no blocklist entry or reason is revealed
