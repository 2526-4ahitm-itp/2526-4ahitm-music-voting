# Spec Delta: playback

## ADDED Requirements

### Requirement: Auto-Refill Skips Blacklisted Songs
When the system refills the queue automatically (see "Empty Queue Behavior"), it MUST NOT add a song that matches the party's blacklist. Blocked candidates MUST be skipped in the usual source order (default playlist, then similar songs, Top-Charts and search). If no allowed candidate is found, refill behaves as when it yields nothing.

#### Scenario: Blocked playlist song is skipped
- GIVEN the party's default playlist starts with song X by artist A, followed by song Y
- AND the blacklist contains artist A
- WHEN the queue is refilled
- THEN song Y is added to the queue
- AND song X is not added

#### Scenario: Party without blacklist refills as before
- GIVEN the party's blacklist is empty
- WHEN the queue is refilled
- THEN the first eligible song from the refill sources is added, exactly as without a blacklist

#### Scenario: Every candidate is blocked
- GIVEN every refill candidate matches the blacklist
- WHEN the playing song ends with no other songs queued
- THEN no blocked song is added
- AND the dashboard displays "Warteschlange ist leer"
