# Playback Specification

## Purpose

Defines how music actually plays: where it plays, how songs advance, and what happens when the queue empties. Playback decisions are driven by the queue and by host controls.

## Requirements

### Requirement: Playback on Monitor/TV
The audio MUST play in the dashboard (browser on monitor/TV). Guest and host clients MUST NOT play audio themselves.

#### Scenario: Audio originates on the dashboard only
- GIVEN a party with a dashboard, a host phone, and guest phones connected
- WHEN a song starts playing
- THEN only the dashboard produces audio
- AND no audio is produced by host or guest clients

### Requirement: Advance on Song End or Skip
When the current song ends or is skipped by the host, the system MUST remove that song from the queue and start the next song selected by the queue's sort order.

#### Scenario: Natural advance
- GIVEN song X is playing and song Y is next by sort order
- WHEN song X ends
- THEN song X is removed from the queue
- AND song Y begins playing

#### Scenario: Skip advances to next by sort order
- GIVEN song X is playing and song Y is next by sort order
- WHEN the host skips
- THEN song X is removed
- AND song Y begins playing

### Requirement: Empty Queue Behavior
When the queue is empty, the dashboard MUST show an "Warteschlange ist leer" state and playback MUST stop or pause (provider-dependent).

#### Scenario: Last song finishes with empty queue
- GIVEN only song X is in the queue and it is playing
- WHEN song X ends
- THEN the queue is empty
- AND the dashboard displays "Warteschlange ist leer"
- AND no further song starts automatically

### Requirement: No Play History
The system MUST NOT retain a history of previously played songs. Once a song leaves the queue (by completion or skip), it MUST NOT reappear automatically.

#### Scenario: Played song does not auto-rejoin queue
- GIVEN song X just finished and is out of the queue
- WHEN the system updates the queue
- THEN song X is not re-added as "recently played" or "history"
- AND song X can be re-added only by a guest through search (subject to queue rules)
