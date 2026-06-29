# Search Specification

## Purpose

Defines how guests find songs to add: free-text search through the party's provider, with a top-charts fallback when the search box is empty. Search results are the only way to add a song to the queue.

## Requirements

### Requirement: Search Uses the Party's Provider
Search queries MUST be sent to the provider the party is bound to. Cross-provider search MUST NOT occur.

#### Scenario: Spotify party searches Spotify
- GIVEN a party bound to Spotify
- WHEN a guest submits the search query "Imagine"
- THEN results come from Spotify
- AND no results come from YouTube

#### Scenario: YouTube party searches YouTube
- GIVEN a party bound to YouTube
- WHEN a guest submits a search query
- THEN results come from YouTube
- AND no results come from Spotify

### Requirement: Empty Search Shows Top Charts
When the search input is empty, the system MUST show the top 10 tracks from the party's provider. The top-charts feed MUST NOT be region-locked.

#### Scenario: Guest opens search with empty input
- GIVEN a guest opens the search view with an empty input
- WHEN results are requested
- THEN the 10 top-chart tracks of the party's provider are shown
- AND the result set is the same regardless of the guest's country

### Requirement: Add From Search Result Only
The "+" affordance on a search result MUST be the only supported way for a guest to add a song to the queue. Pasting a URL or ID MUST NOT be a supported add path.

#### Scenario: Guest has no way to paste a link
- GIVEN a guest is on the add-song view
- WHEN the guest inspects the UI
- THEN there is no input accepting URLs or song IDs
- AND adds are possible only by tapping "+" on a search result

### Requirement: iOS Search Handles Unavailable Tracks and Backend Errors Gracefully
The iOS search client MUST silently skip null or unavailable track entries returned by Spotify without failing the entire result set. The client MUST distinguish between a successful response with no matching results, a backend-side error (non-2xx HTTP status), and a network failure, and display an appropriate message for each case.

- Null entries in the Spotify `items` array MUST be filtered out; a response that is otherwise valid MUST still show the non-null results.
- A non-2xx HTTP response MUST show a specific "Suche fehlgeschlagen" message and MUST NOT show "Backend nicht erreichbar".
- A network-level failure (no connection, timeout) MUST show "Backend nicht erreichbar. Bitte Backend starten und erneut versuchen."

#### Scenario: Response contains some null tracks
- GIVEN the Spotify search API returns an `items` array where some entries are null
- WHEN the iOS search client receives the response
- THEN the valid tracks are displayed and no error message is shown

#### Scenario: Backend returns a non-2xx error
- GIVEN the backend returns HTTP 500 for a search query
- WHEN the iOS search client receives the response
- THEN "Suche fehlgeschlagen. Bitte erneut versuchen." is shown
- AND "Backend nicht erreichbar" is NOT shown

#### Scenario: No network connection
- GIVEN the device has no network connectivity
- WHEN the iOS search client attempts a search
- THEN "Backend nicht erreichbar. Bitte Backend starten und erneut versuchen." is shown
