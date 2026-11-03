# Spec Delta

## MODIFIED Requirements

### Requirement: Blacklist Is Visible Only to the Host
Reading the blacklist, editing it and searching for artists to block MUST require the host credential. Requests without it MUST be rejected as unauthorized. Guests MUST NOT be shown the blacklist entries or the reason why a song is blocked. The only exception: when a guest searches for a banned artist by name, the guest search MAY say "Dieser Artist ist nicht zulässig." (see `search/spec.md`).

#### Scenario: Guest requests the blacklist
- GIVEN a party with blacklist entries
- WHEN a request without the host PIN asks for the party's blacklist
- THEN the request is rejected as unauthorized
- AND no blacklist entries are returned

#### Scenario: Guest attempts to add a blacklist entry
- GIVEN a guest connected to a party
- WHEN the guest sends a request to add a blacklist word
- THEN the request is rejected as unauthorized
- AND the blacklist is unchanged

#### Scenario: Guest search hint does not list other entries
- GIVEN the blacklist contains artist A, artist B and the word "live"
- WHEN a guest searches for "A"
- THEN the guest is told "Dieser Artist ist nicht zulässig."
- AND artist B and the word "live" are not revealed
