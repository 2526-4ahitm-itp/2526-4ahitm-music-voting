# Delta for Voting

## ADDED Requirements

### Requirement: Persistent Device Identity
Each client MUST generate a persistent `deviceId` UUID on first use and store it durably so it survives app close and reopen. On web, the `deviceId` MUST be stored in both `localStorage` and a long-lived cookie (min 1 year) so that clearing one storage mechanism alone does not create a new identity. On iOS, the `deviceId` MUST be stored in `UserDefaults` and survive app restarts.

#### Scenario: Web guest closes and reopens the browser
- GIVEN a guest has voted for song X using deviceId "abc"
- WHEN the guest closes the browser tab and reopens the app
- THEN the same deviceId "abc" is used for subsequent requests
- AND the queue shows song X with `hasVoted: true`

#### Scenario: Web guest clears localStorage but cookie remains
- GIVEN a guest has deviceId "abc" stored in both localStorage and cookie
- WHEN the guest clears localStorage only
- THEN the app recovers deviceId "abc" from the cookie
- AND no new identity is created

### Requirement: Optimistic Vote UI
When a guest toggles a vote, the UI MUST update the heart icon and like count immediately without waiting for the server response. If the server returns an error, the UI MUST revert to the state before the tap.

#### Scenario: Vote tap gives immediate feedback
- GIVEN a guest views a song with 2 likes and `hasVoted: false`
- WHEN the guest taps the heart button
- THEN the heart fills and the count shows 3 immediately
- AND the server request is sent in the background

#### Scenario: Vote tap reverts on error
- GIVEN a guest taps the heart and the server returns an error
- WHEN the error response arrives
- THEN the heart returns to unfilled and the count returns to its previous value
