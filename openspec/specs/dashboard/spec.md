# Dashboard Specification

## Purpose

Defines the monitor/TV display: what is continuously visible, what is never visible, and how the dashboard behaves across reloads. The dashboard is a passive viewer plus the audio sink — it contains no host controls.

## Requirements

### Requirement: Persistent Dashboard Elements
The dashboard MUST continuously display:
- a QR code for joining the party,
- the currently playing song's cover, title, and artist,
- an animated progress bar with elapsed/total time in `mm:ss / mm:ss` format,
- the queue with cover, title, artist, and like count per entry, sorted per `queue/spec.md`.

#### Scenario: All elements visible during playback
- GIVEN a party is playing a song with a non-empty queue
- WHEN a viewer looks at the dashboard
- THEN the QR code, current song info, animated progress bar, time readout, and sorted queue are all visible simultaneously

### Requirement: No Host Controls on Dashboard
The dashboard MUST NOT expose pause, resume, skip, remove, blacklist, or end-party controls. These live on the host client only.

#### Scenario: Dashboard contains no control affordances
- GIVEN the dashboard is connected to a party
- WHEN a viewer inspects the dashboard UI
- THEN no button or gesture allows pause, resume, skip, remove, blacklist edits, or ending the party

### Requirement: Dashboard Does Not Attribute Songs to Guests
The dashboard MUST NOT display which guest requested a given song.

#### Scenario: No requester shown
- GIVEN guest A added song X
- WHEN the dashboard renders the queue entry for song X
- THEN no indication of guest A (or any guest) is shown

### Requirement: Dashboard Reconnects Without PIN
After a reload or transient disconnect, the dashboard MUST automatically reconnect to the same party without prompting for the PIN again.

#### Scenario: Dashboard reloads
- GIVEN the dashboard is bound to party P (PIN entered previously)
- WHEN the dashboard's browser reloads
- THEN the dashboard rejoins party P automatically
- AND the PIN is not requested again
