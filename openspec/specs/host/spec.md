# Host Specification

## Purpose

Defines the host role: the party creator who has exclusive permission to control playback, curate the queue manually, and manage a party-scoped blacklist. Host controls run on the host's own device (typically a phone); the dashboard never exposes host controls.

## Requirements

### Requirement: Host Controls Playback
The host MUST be able to pause, resume, and skip the currently playing song.

#### Scenario: Host pauses playback
- GIVEN a song is playing
- WHEN the host taps "Pause"
- THEN playback on the dashboard pauses
- AND the paused state is reflected on every connected client

#### Scenario: Host skips the current song
- GIVEN a song is playing
- WHEN the host taps "Skip"
- THEN the current song is removed from the queue
- AND the next song in sort order begins playing

### Requirement: Host Removes Songs from Queue
The host MUST be able to remove any song from the queue, including ones not yet played.

#### Scenario: Host removes a queued song
- GIVEN a queue with three upcoming songs
- WHEN the host removes the second song
- THEN that song is gone from the queue on every client
- AND the remaining queue is re-sorted according to queue rules

### Requirement: Host Manages Party Blacklist
The host MUST be able to add and remove words from a blacklist scoped to the current party. When a guest attempts to add a song whose title or artist contains a blacklist word as a substring, the add MUST be rejected.

#### Scenario: Blacklisted word blocks a matching song
- GIVEN the blacklist contains the word "remix"
- WHEN a guest attempts to add a song whose title is "My Song (Remix)"
- THEN the add is rejected
- AND the guest sees the message "Nicht erlaubt."

#### Scenario: Host adds a new blacklist word mid-party
- GIVEN an active party with an empty blacklist
- WHEN the host adds the word "explicit" to the blacklist
- THEN future guest adds matching "explicit" as a substring are rejected
- AND songs already in the queue are not retroactively removed

### Requirement: Host-Only Actions Are Restricted
Guests MUST NOT be able to invoke pause, resume, skip, remove-from-queue, blacklist-edit, or end-party actions. Attempts by non-hosts MUST be rejected.

#### Scenario: Guest attempts to skip
- GIVEN a guest connected to a party
- WHEN the guest sends a skip request
- THEN the request is rejected as unauthorized
- AND the current playback is unaffected
