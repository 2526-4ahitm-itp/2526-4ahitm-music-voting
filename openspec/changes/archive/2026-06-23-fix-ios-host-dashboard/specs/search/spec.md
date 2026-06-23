# Δ search/spec.md

## ADDED Requirements

### Requirement: iOS Search Handles Unavailable Tracks and Backend Errors Gracefully
The iOS search client MUST silently skip null or unavailable track entries returned by Spotify without failing the entire result set. The client MUST distinguish between a successful response with no matching results, a backend-side error (non-2xx HTTP status), and a network failure, and display an appropriate message for each case.

- Null entries in the Spotify `items` array MUST be filtered out; a response that is otherwise valid MUST still show the non-null results.
- A non-2xx HTTP response MUST show a specific "Suche fehlgeschlagen" message and MUST NOT show "Backend nicht erreichbar".
- A network-level failure (no connection, timeout) MUST show "Backend nicht erreichbar. Bitte Backend starten und erneut versuchen."

#### Scenario: Response contains some null tracks
- GIVEN the Spotify search API returns an `items` array where two out of five entries are null (e.g. tracks unavailable in the current market)
- WHEN the iOS search client receives the response
- THEN the three valid tracks are displayed
- AND no error message is shown
- AND the app does not crash or show an empty list

#### Scenario: Backend returns a non-2xx error
- GIVEN the backend returns HTTP 500 for a search query
- WHEN the iOS search client receives the response
- THEN "Suche fehlgeschlagen. Bitte erneut versuchen." is shown
- AND "Backend nicht erreichbar" is NOT shown

#### Scenario: No network connection
- GIVEN the device has no network connectivity
- WHEN the iOS search client attempts a search
- THEN "Backend nicht erreichbar. Bitte Backend starten und erneut versuchen." is shown
