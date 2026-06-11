# Δ search/spec.md

## ADDED Requirements

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
