# Spec Delta: queue

## MODIFIED Requirements

### Requirement: Blacklist Enforced on Add
An add MUST be rejected if the song matches any entry on the party's blacklist: a blacklisted word appearing as a whole word (case-insensitive) in the song's title or any artist name, a blacklisted artist taking part in the song, or the song itself being blacklisted. The rejection MUST apply to every client (web guest, web host, iOS app). A rejected song MUST NOT enter the queue and MUST NOT trigger a queue update for other clients. See `host/spec.md` for blacklist management.

#### Scenario: Blacklist blocks an add
- GIVEN the blacklist contains "live"
- WHEN a guest attempts to add "Song X (Live)"
- THEN the add is rejected
- AND the guest sees "Nicht erlaubt."

#### Scenario: Word matching ignores case and partial words
- GIVEN the blacklist contains "live"
- WHEN guests attempt to add "LIVE at Wembley" and "Delivery"
- THEN "LIVE at Wembley" is rejected
- AND "Delivery" is accepted

#### Scenario: Blacklisted artist blocks an add
- GIVEN the blacklist contains artist A
- WHEN a guest attempts to add any song by artist A
- THEN the add is rejected
- AND the guest sees "Nicht erlaubt."

#### Scenario: Rejected add leaves the queue unchanged
- GIVEN the blacklist contains song X
- WHEN a guest attempts to add song X
- THEN song X does not appear in the queue on any client
