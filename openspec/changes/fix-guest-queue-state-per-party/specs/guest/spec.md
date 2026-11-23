## ADDED Requirements

### Requirement: Queue Marking Belongs to the Current Party

The "Schon in der Warteschlange" marking in the search MUST only reflect songs waiting in the party the client is currently in. When the client switches to another party (joining a new party in the same tab, or leaving), the set of queued songs MUST be cleared at once and reloaded for the new party; a queue response that arrives for a party the client has already left MUST be ignored.

#### Scenario: Song added in an earlier party can be added in the new party
- **GIVEN** a guest added song X in party A
- **AND** the guest then joins party B in the same browser tab, whose queue does not contain X
- **WHEN** the guest searches for X
- **THEN** X is not marked "Schon in der Warteschlange"
- **AND** the guest can add X to party B

#### Scenario: Late response of the old party is ignored
- **GIVEN** the queue of party A is still loading
- **WHEN** the guest switches to party B and A's queue response arrives afterwards
- **THEN** the marking shows only the songs of party B
