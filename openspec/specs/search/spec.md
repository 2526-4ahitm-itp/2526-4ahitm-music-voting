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

### Requirement: Queued Songs Show a Disabled Checkmark in Search Results
A search result whose track URI is already present in the party's queue MUST display a checkmark in place of the "+" affordance and MUST be unclickable. This state MUST be visible to every client viewing search results, not only the guest who added the song, and MUST update live without a manual refresh as the queue changes.

#### Scenario: Song added by one guest shows as queued for another guest
- GIVEN guest A and guest B both have the same search results open
- WHEN guest A adds song X to the queue
- THEN guest B's search result for song X switches from "+" to a disabled checkmark without guest B refreshing
- AND guest A's own result for song X also shows a disabled checkmark

#### Scenario: Already-queued song shown on initial search
- GIVEN song X is already in the party's queue
- WHEN a guest searches and song X appears in the results
- THEN song X's result shows a disabled checkmark from the moment results are displayed

#### Scenario: Song removed from queue reverts to addable
- GIVEN song X is in the queue and its search result shows a disabled checkmark
- WHEN song X is removed from the queue (played to completion or removed by the host)
- THEN song X's search result, if still on screen, switches back to an enabled "+" without a manual refresh

### Requirement: Blacklisted Search Results Cannot Be Added
Search results MUST indicate whether each track matches the party's blacklist. In the web guest and host search, a blocked result MUST still be shown but greyed out, with a disabled "+". The host search additionally shows the hint "Nicht erlaubt."; the guest search MUST NOT show any text hint, only the greyed-out result. The result MUST NOT reveal which blacklist entry caused the block.

#### Scenario: Guest sees a blocked song in search
- GIVEN the blacklist contains the word "live"
- WHEN a guest searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND no hint text such as "Nicht erlaubt." is shown next to it
- AND other results remain addable

#### Scenario: Host sees a blocked song in search
- GIVEN the blacklist contains the word "live"
- WHEN the host searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND the hint "Nicht erlaubt." is shown

#### Scenario: Blocked result does not reveal the reason
- GIVEN the blacklist contains artist A
- WHEN a guest searches and a song by artist A appears in the results
- THEN the result is marked as not allowed
- AND neither the blocked artist nor any other blacklist entry is shown to the guest

#### Scenario: Song blocked by the host is greyed out on the next search
- GIVEN the host blocked song X via "Song sperren"
- WHEN a guest searches and song X appears in the results
- THEN song X is shown greyed out with a disabled "+"

#### Scenario: Open search results update as soon as the host blocks a song
- GIVEN a guest has search results open in the web app and song X is shown addable
- WHEN the host blocks song X via "Song sperren"
- THEN the guest's results update without the guest searching again
- AND song X is shown greyed out with a disabled "+"
- AND the update does not tell the guest which entry was added
