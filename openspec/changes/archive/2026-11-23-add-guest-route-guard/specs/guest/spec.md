## ADDED Requirements

### Requirement: Guest Views Require a Joined Party

The guest views `/voting` and `/guest` MUST only open when the client has joined a party (a party ID is stored for this browser). Without a joined party, navigating to either route MUST redirect the guest to the code entry `/code`. The PIN MUST NOT be required in these URLs; `/join/<pin>` remains the entry point that carries a PIN.

#### Scenario: Guest opens the voting view without having joined
- **GIVEN** no party is stored in the browser
- **WHEN** the guest opens `/voting`
- **THEN** the app redirects to `/code`
- **AND** the guest can enter the 5-digit code there

#### Scenario: Guest opens the add view without having joined
- **GIVEN** no party is stored in the browser
- **WHEN** the guest opens `/guest`
- **THEN** the app redirects to `/code`

#### Scenario: Joined guest opens the voting view
- **GIVEN** the guest has joined a party via `/join/<pin>` or the code entry
- **WHEN** the guest opens `/voting` (for example after a reload)
- **THEN** the voting view of that party opens
