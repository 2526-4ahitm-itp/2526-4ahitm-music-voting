# Δ party/spec.md

## ADDED Requirements

### Requirement: Party Stores an Optional Default Playlist
A party MUST be able to store an optional default-playlist reference (the Spotify playlist id) chosen at creation. The value MUST be nullable (a party may have no default playlist) and MUST be persisted on the party's database row so it survives a backend restart and is available wherever the party is resolved by id.

#### Scenario: Default playlist persists across restart
- GIVEN a party was created with a default playlist set
- WHEN the backend restarts and the party is reconstructed from the database
- THEN the party's default playlist id is still present

#### Scenario: Party without a default playlist
- GIVEN a party was created without choosing a default playlist
- WHEN the party is resolved
- THEN its default playlist reference is null
