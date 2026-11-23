# Spec Delta: search

## MODIFIED Requirements

### Requirement: Empty Search Shows Top Charts
When the search input of a dedicated search view is empty, the system MUST show the top 10 tracks from the party's provider. The top-charts feed MUST NOT be region-locked. On the web guest page the search field sits above the queue, so an empty field MUST show the queue instead of Top Charts (see `guest/spec.md` "Guest Uses One Page for Queue and Search").

#### Scenario: Guest opens search with empty input
- GIVEN a guest opens a dedicated search view (iOS) with an empty input
- WHEN results are requested
- THEN the 10 top-chart tracks of the party's provider are shown
- AND the result set is the same regardless of the guest's country

#### Scenario: Empty field on the web guest page
- GIVEN a guest is on the web guest page `/voting`
- WHEN the search field is empty
- THEN the queue is shown and no Top-Charts request is sent

### Requirement: Queued Songs Show a Disabled Checkmark in Search Results
A search result whose track URI is already present in the party's queue MUST display a checkmark in place of the "+" affordance and MUST be unclickable. This state MUST be visible to every client viewing search results, not only the guest who added the song, and MUST update live without a manual refresh as the queue changes. Exception: the web guest page shows such a result as a like control instead of a checkmark (see `guest/spec.md` "Guest Votes on Queued Songs from Search Results"); it still cannot be added again.

#### Scenario: Song added by one guest shows as queued for another guest
- GIVEN guest A and guest B both have the same search results open in the iOS app
- WHEN guest A adds song X to the queue
- THEN guest B's search result for song X switches from "+" to a disabled checkmark without guest B refreshing
- AND guest A's own result for song X also shows a disabled checkmark

#### Scenario: Already-queued song shown on initial search
- GIVEN song X is already in the party's queue
- WHEN the host searches on the web dashboard and song X appears in the results
- THEN song X's result shows a disabled checkmark from the moment results are displayed

#### Scenario: Song removed from queue reverts to addable
- GIVEN song X is in the queue and its search result shows a disabled checkmark
- WHEN song X is removed from the queue (played to completion or removed by the host)
- THEN song X's search result, if still on screen, switches back to an enabled "+" without a manual refresh

#### Scenario: Web guest sees a like control instead of a checkmark
- GIVEN song X is in the queue
- WHEN a guest searches on the web guest page and song X appears in the results
- THEN song X shows its like count and heart instead of "+" or a checkmark
- AND no "+" for song X is offered
