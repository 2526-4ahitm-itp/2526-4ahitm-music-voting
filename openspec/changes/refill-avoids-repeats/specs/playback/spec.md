# Spec Delta

## MODIFIED Requirements

### Requirement: No Play History
The system MUST NOT retain a history of previously played songs that is shown to anyone or stored beyond the party's runtime. Once a song leaves the queue (by completion or skip), it MUST NOT reappear automatically, except as the last-resort repeat defined in "Auto-Refill Prefers Songs Not Yet Played". The system MAY keep an internal, in-memory list of the songs played or auto-filled in the current party solely to avoid such repeats.

#### Scenario: Played song does not auto-rejoin queue
- GIVEN song X just finished and is out of the queue
- WHEN the system updates the queue
- THEN song X is not re-added as "recently played" or "history"
- AND song X can be re-added only by a guest through search (subject to queue rules)

#### Scenario: Played guest song is not refilled from the default playlist
- **GIVEN** a guest added song X, which is also on the party's default playlist
- **AND** song X has finished playing
- **WHEN** the system refills the queue from the default playlist
- **THEN** song X is not added while the default playlist or a later source still has a song not yet played in this party

## ADDED Requirements

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
- **GIVEN** the only songs any source yields were played earlier and are now on the blacklist
- **WHEN** the system refills the queue
- **THEN** no song is added and the dashboard displays "Warteschlange ist leer"
