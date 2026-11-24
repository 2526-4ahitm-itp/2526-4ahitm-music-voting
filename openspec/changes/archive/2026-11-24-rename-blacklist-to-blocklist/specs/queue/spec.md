# Spec Delta: queue

## ADDED Requirements

### Requirement: Blocklist Enforced on Add
An add MUST be rejected if the song matches any entry on the party's blocklist: a blocklisted word appearing as a whole word (case-insensitive) in the song's title or any artist name, a blocklisted artist taking part in the song, or the song itself being blocklisted. The rejection MUST apply to every client (web guest, web host, iOS app). A rejected song MUST NOT enter the queue and MUST NOT trigger a queue update for other clients. See `host/spec.md` for blocklist management.

#### Scenario: Blocklist blocks an add
- GIVEN the blocklist contains "live"
- WHEN a guest attempts to add "Song X (Live)"
- THEN the add is rejected
- AND the guest sees "Nicht erlaubt."

#### Scenario: Word matching ignores case and partial words
- GIVEN the blocklist contains "live"
- WHEN guests attempt to add "LIVE at Wembley" and "Delivery"
- THEN "LIVE at Wembley" is rejected
- AND "Delivery" is accepted

#### Scenario: Blocklisted artist blocks an add
- GIVEN the blocklist contains artist A
- WHEN a guest attempts to add any song by artist A
- THEN the add is rejected
- AND the guest sees "Nicht erlaubt."

#### Scenario: Rejected add leaves the queue unchanged
- GIVEN the blocklist contains song X
- WHEN a guest attempts to add song X
- THEN song X does not appear in the queue on any client

## MODIFIED Requirements

### Requirement: Songs Are Added Only via Search
Guests MUST add songs via search results only. Pasting links or IDs MUST NOT be a supported add path.

#### Scenario: Guest adds a song from search
- GIVEN a guest has searched and received results
- WHEN the guest taps the "+" on a result
- THEN that song enters the queue (subject to duplicate and blocklist checks)

## REMOVED Requirements

### Requirement: Blacklist Enforced on Add
**Reason**: Renamed: "Blacklist" is now called "Blocklist" everywhere (team decision 2026-11-23).
**Migration**: Replaced by "Blocklist Enforced on Add" with the same behaviour.
