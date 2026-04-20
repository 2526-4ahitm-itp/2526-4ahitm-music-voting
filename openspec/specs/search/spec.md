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
