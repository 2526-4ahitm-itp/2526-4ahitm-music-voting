# Party Specification

## Purpose

Defines the lifecycle of a party: how it is created, how it is identified to clients, which music provider it uses, and how it ends. A party is the top-level aggregate that owns a queue, a host session, guests, a dashboard, and a provider binding.

## Requirements

### Requirement: Party Creation by Host
The system MUST allow a host to create a new party and MUST require the host to select exactly one music provider (Spotify or YouTube) during creation.

#### Scenario: Host creates a party with Spotify
- GIVEN a host has opened the application
- WHEN the host clicks "Create party" and selects Spotify
- THEN the system creates a new party bound to Spotify
- AND the host is prompted to authenticate with Spotify via OAuth

#### Scenario: Host creates a party with YouTube
- GIVEN a host has opened the application
- WHEN the host clicks "Create party" and selects YouTube
- THEN the system creates a new party bound to YouTube
- AND the host is prompted to authenticate with YouTube via OAuth

### Requirement: Single Provider per Party
A party MUST use exactly one provider for its entire lifetime. The provider MUST NOT be changed after the party has been created.

#### Scenario: Provider is fixed after creation
- GIVEN a party bound to Spotify
- WHEN any client inspects the party
- THEN the provider is reported as Spotify for the entire lifetime of the party
- AND no API allows switching the provider

### Requirement: Party Identity and Join Artifacts
On creation, the system MUST generate a party-ID, a numeric PIN, and a join URL suitable for QR-code encoding. The PIN and join URL MUST uniquely identify the party until it ends.

#### Scenario: Host sees party credentials after creation
- GIVEN the host has just created a party
- WHEN the creation completes
- THEN the host sees the PIN and a QR code / join link
- AND the QR code encodes the join URL

#### Scenario: PIN is unique among active parties
- GIVEN two parties are created in quick succession
- WHEN the system assigns each a PIN
- THEN no two concurrently-active parties share the same PIN

### Requirement: Host Provider Login is Party-Scoped
The host's provider login MUST apply only to the party in which the login occurred. A new party MUST require a new provider login and MUST NOT reuse tokens from a previous party.

#### Scenario: New party requires new provider login
- GIVEN the host previously created and ended a party with Spotify
- WHEN the host creates a new party with Spotify
- THEN the host is prompted to authenticate with Spotify again

### Requirement: Host Ends Party
The host MUST be able to end the party. Ending a party MUST close the party, empty its queue, delete provider tokens associated with the party, and notify all connected clients that the party has ended.

#### Scenario: Host ends the party
- GIVEN an active party with guests connected and songs in the queue
- WHEN the host triggers "End party"
- THEN the party transitions to ended
- AND the queue is emptied
- AND provider tokens for this party are deleted
- AND every connected client receives a "party ended" notification

### Requirement: Clients Reconnect Automatically
All clients (host, guest, dashboard) MUST automatically attempt to reconnect when the network connection drops, and MUST reload the current party state (queue, current playback, likes) after reconnect.

#### Scenario: Guest loses connection briefly
- GIVEN a guest is connected to a party
- WHEN the guest's network drops and recovers within a reasonable window
- THEN the client reconnects without user action
- AND the displayed queue and playback state match the server state after reconnect
