# Spec Delta: playback

## ADDED Requirements

### Requirement: Auto-Refill Skips Blocklisted Songs
When the system refills the queue automatically (see "Empty Queue Behavior"), it MUST NOT add a song that matches the party's blocklist. Blocked candidates MUST be skipped in the usual source order (default playlist, then similar songs, Top-Charts and search). If no allowed candidate is found, refill behaves as when it yields nothing.

#### Scenario: Blocked playlist song is skipped
- GIVEN the party's default playlist starts with song X by artist A, followed by song Y
- AND the blocklist contains artist A
- WHEN the queue is refilled
- THEN song Y is added to the queue
- AND song X is not added

#### Scenario: Party without blocklist refills as before
- GIVEN the party's blocklist is empty
- WHEN the queue is refilled
- THEN the first eligible song from the refill sources is added, exactly as without a blocklist

#### Scenario: Every candidate is blocked
- GIVEN every refill candidate matches the blocklist
- WHEN the playing song ends with no other songs queued
- THEN no blocked song is added
- AND the dashboard displays "Warteschlange ist leer"

## MODIFIED Requirements

### Requirement: Auto-Refill Prefers Songs Not Yet Played
When the system refills the queue automatically, it MUST take from each source only songs not yet played or auto-filled in the current party. A source that yields no such allowed song MUST count as empty, so the refill falls through to the next source (default playlist, similar songs, Top-Charts, search by artist, broad search). Only if no source yields a new allowed song MAY the system refill a song already played, so that playback does not stop.

#### Scenario: Exhausted default playlist falls through instead of looping
- **GIVEN** the party's default playlist has two songs and both have already been auto-filled and played
- **WHEN** the system refills the queue
- **THEN** it adds a song from the next source (similar songs, Top-Charts or search) that has not been played in this party
- **AND** it does not add either playlist song again

#### Scenario: Artist search fully played falls through to broad search
- **GIVEN** every earlier source yields no new song
- **AND** every track found by the search for the current artist has already been played in this party
- **WHEN** the system refills the queue
- **THEN** it issues the broad search and adds a song not yet played

#### Scenario: Last-resort repeat keeps the music going
- **GIVEN** no source yields a song that has not been played in this party
- **AND** at least one source yields an allowed song that was played earlier
- **WHEN** the system refills the queue
- **THEN** it adds such an earlier played song instead of stopping

#### Scenario: Blacklist still applies to repeats
- **GIVEN** the only songs any source yields were played earlier and are now on the blocklist
- **WHEN** the system refills the queue
- **THEN** no song is added and the dashboard displays "Warteschlange ist leer"

## REMOVED Requirements

### Requirement: Auto-Refill Skips Blacklisted Songs
**Reason**: Renamed: "Blacklist" is now called "Blocklist" everywhere (team decision 2026-11-23).
**Migration**: Replaced by "Auto-Refill Skips Blocklisted Songs" with the same behaviour.
