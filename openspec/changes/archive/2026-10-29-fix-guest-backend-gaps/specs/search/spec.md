## MODIFIED Requirements

### Requirement: Empty Search Shows Top Charts
When the search input is empty, the system MUST show the top 10 tracks from the party's provider. The top-charts feed MUST NOT be region-locked. For Spotify, the top charts are the first 10 tracks of the playlist configured as `spotify.topcharts.playlist.id`, returned by the search endpoint for an empty or missing `q` in the same shape as a search result (`tracks.items`). If no playlist is configured or it cannot be read, the endpoint MUST return an empty result with HTTP 200, never a server error. On the web add/search view, top-chart results MUST be labelled „Top-Charts“; with an empty result the welcome text is shown.

#### Scenario: Guest opens search with empty input
- GIVEN a guest opens the search view with an empty input
- WHEN results are requested
- THEN the 10 top-chart tracks of the party's provider are shown
- AND the result set is the same regardless of the guest's country

#### Scenario: No top-charts playlist configured
- GIVEN no top-charts playlist is configured
- WHEN the search endpoint is called with an empty `q`
- THEN it answers HTTP 200 with an empty `tracks.items` list
- AND the web add view shows its welcome text
