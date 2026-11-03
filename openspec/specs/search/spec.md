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
Search results MUST indicate whether each track matches the party's blacklist. In the web host search, a blocked result MUST still be shown but greyed out, with a disabled "+" and the hint "Nicht erlaubt.". In the web guest search, a song by a banned artist MUST NOT be shown at all; a song blocked only by a word or song entry MUST be shown greyed out with a disabled "+" and no text next to it. When the guest search removed songs or shows greyed-out songs, a hint MUST appear below the search field: "Dieser Artist ist nicht zulässig." if songs were removed and the search term is the name of a banned artist (case-insensitive, surrounding spaces ignored), otherwise "Einige Ergebnisse sind auf dieser Party nicht zulässig.". The hint MUST NOT say which result is affected or why. If every result was removed, this hint MUST replace "Keine Treffer für „…“". The result MUST NOT list or reveal any blacklist entry other than the artist the guest searched for by name.

#### Scenario: Guest sees a blocked song in search
- GIVEN the blacklist contains the word "live"
- WHEN a guest searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND no hint text such as "Nicht erlaubt." is shown next to it
- AND "Einige Ergebnisse sind auf dieser Party nicht zulässig." is shown below the search field
- AND other results remain addable

#### Scenario: Host sees a blocked song in search
- GIVEN the blacklist contains the word "live"
- WHEN the host searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND the hint "Nicht erlaubt." is shown

#### Scenario: Host still sees songs of a banned artist
- GIVEN the blacklist contains artist A
- WHEN the host searches for "A"
- THEN the songs of artist A are shown greyed out with "Nicht erlaubt."

#### Scenario: Guest searches for a banned artist by name
- GIVEN the blacklist contains artist "Drake"
- WHEN a guest searches for "drake"
- THEN no song by Drake is shown
- AND "Dieser Artist ist nicht zulässig." is shown below the search field
- AND songs by other artists in the results remain shown

#### Scenario: Banned artist's songs are hidden from an unrelated search
- GIVEN the blacklist contains artist A
- WHEN a guest searches for a term that is not A's name and a song by artist A is among the results
- THEN that song is not shown
- AND "Einige Ergebnisse sind auf dieser Party nicht zulässig." is shown below the search field
- AND artist A's name is not shown anywhere

#### Scenario: All results hidden
- GIVEN the blacklist contains artist "Drake"
- WHEN a guest searches for "Drake" and every result is a song by Drake
- THEN "Dieser Artist ist nicht zulässig." is shown
- AND "Keine Treffer für „Drake“" is not shown

#### Scenario: No hint when nothing was hidden or greyed out
- GIVEN the blacklist contains artist A
- WHEN a guest searches and no result is by artist A or otherwise blocked
- THEN no hint about blocked results is shown

#### Scenario: Blocked result does not reveal the reason
- GIVEN the blacklist contains the word "live"
- WHEN a guest searches and a song blocked by that word appears in the results
- THEN the result is marked as not allowed
- AND neither the word nor any other blacklist entry is shown to the guest

#### Scenario: Song blocked by the host is greyed out on the next search
- GIVEN the host blocked song X via "Song entfernen" → "Auch sperren"
- WHEN a guest searches and song X appears in the results
- THEN song X is shown greyed out with a disabled "+"
- AND "Einige Ergebnisse sind auf dieser Party nicht zulässig." is shown below the search field

#### Scenario: Open search results update as soon as the host blocks a song
- GIVEN a guest has search results open in the web app and song X is shown addable
- WHEN the host blocks song X via "Song entfernen" → "Auch sperren"
- THEN the guest's results update without the guest searching again
- AND song X is shown greyed out with a disabled "+"
- AND the update does not tell the guest which entry was added

#### Scenario: Open search results update when the host bans an artist
- GIVEN a guest has search results open in the web app that include a song by artist A
- WHEN the host adds artist A to the blacklist
- THEN the guest's results update without the guest searching again
- AND the song by artist A is no longer shown
