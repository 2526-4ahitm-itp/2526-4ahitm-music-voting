## REMOVED Requirements

### Requirement: Per-Guest Add Rate Limit
**Reason**: Das Limit steigt von 10 auf 20 Songs pro Minute. Ein Szenario-Name enthielt die alte Zahl, und OpenSpec erlaubt beim Ändern kein Umbenennen von Szenarien.
**Migration**: Ersetzt durch „Guest Add Limit per Minute“ (gleiches Verhalten, Limit 20).

## ADDED Requirements

### Requirement: Guest Add Limit per Minute
A guest MUST NOT be able to add more than 20 songs per rolling minute. Exceeding the limit MUST be rejected with a user-visible message. The guest is identified by their persistent `deviceId`; only songs actually added count. The host (valid host PIN) is exempt.

#### Scenario: Guest is rate-limited after 20 adds
- GIVEN a guest who has added 20 songs within the last minute
- WHEN the guest attempts to add a 21st song
- THEN the request is rejected
- AND the guest sees a message such as "Zu viele Anfragen — bitte kurz warten."

#### Scenario: Rejection carries status and wait time
- **GIVEN** a guest who has added 20 songs within the last 60 seconds
- **WHEN** the guest sends another add request with their `deviceId`
- **THEN** the backend answers HTTP 429 with the error "Zu viele Anfragen — bitte kurz warten."
- **AND** includes `retryAfterSeconds`, the seconds until the oldest of those adds leaves the window

#### Scenario: Window rolls forward
- **GIVEN** a guest added 20 songs, the first of them 61 seconds ago
- **WHEN** the guest adds another song
- **THEN** the song is added

#### Scenario: Rejected adds do not count
- **GIVEN** a guest whose add is rejected because the song is already queued or blacklisted
- **WHEN** the guest adds other songs afterwards
- **THEN** the rejected attempt does not count towards the 20 songs

#### Scenario: Limit is per guest and per party
- **GIVEN** guest A has reached the limit
- **WHEN** guest B of the same party adds a song
- **THEN** guest B's song is added

#### Scenario: Host is not limited
- **GIVEN** the host sends add requests with a valid host PIN
- **WHEN** the host adds more than 20 songs within a minute
- **THEN** every song is added

### Requirement: Web Guest Sees When Adding Is Possible Again
When the backend rejects a guest's add with HTTP 429, the web guest view MUST show the countdown "Du kannst in <N> s wieder Songs hinzufügen.", starting at `retryAfterSeconds` and counting down every second. While it runs, every "+" button MUST be disabled; songs that could otherwise be added get the `aria-label` "Bitte kurz warten" (blocked and already queued songs keep their labels). The countdown MUST survive switching guest tabs.

#### Scenario: Countdown after the limit is hit
- **GIVEN** a guest on the search view whose add is answered with HTTP 429 and `retryAfterSeconds` 30
- **WHEN** the rejection arrives
- **THEN** "Du kannst in 30 s wieder Songs hinzufügen." is shown
- **AND** every "+" button is disabled, and the ones of addable songs are labelled "Bitte kurz warten"

#### Scenario: Countdown runs out
- **GIVEN** the countdown shows 1 s
- **WHEN** one more second passes
- **THEN** the countdown is no longer shown
- **AND** the "+" buttons can be used again

#### Scenario: Countdown survives switching tabs
- **GIVEN** the countdown shows 40 s
- **WHEN** the guest opens the voting tab and returns to the search view 10 seconds later
- **THEN** the countdown shows about 30 s
