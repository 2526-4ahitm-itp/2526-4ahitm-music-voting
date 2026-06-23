# Δ guest/spec.md

## ADDED Requirements

### Requirement: Guest Bottom Tab Navigation
The web guest experience MUST present a persistent bottom tab bar on both guest views — the voting view (`/voting`) and the add/search view (`/guest`). The tab bar MUST contain exactly two tabs: "Voten" navigating to `/voting`, and "Hinzufügen" navigating to `/guest`. The tab corresponding to the currently displayed view MUST be marked active. No burger button or slide-in side menu is used for navigation between guest views.

#### Scenario: Guest switches from voting to adding songs
- GIVEN a guest is on the voting view (`/voting`) with the "Voten" tab active
- WHEN the guest taps the "Hinzufügen" tab
- THEN the app navigates to the add/search view (`/guest`)
- AND the "Hinzufügen" tab is now marked active

#### Scenario: Guest switches from adding back to voting
- GIVEN a guest is on the add/search view (`/guest`) with the "Hinzufügen" tab active
- WHEN the guest taps the "Voten" tab
- THEN the app navigates to the voting view (`/voting`)
- AND the "Voten" tab is now marked active

### Requirement: Guest Lands on the Voting View After Joining
After a guest successfully enters a valid party PIN, the app MUST navigate the guest to the voting view (`/voting`) so the queue is the first thing shown. The guest can move to the add/search view via the bottom tab bar.

#### Scenario: Guest joins with a valid PIN
- GIVEN a guest enters a valid party PIN that resolves successfully
- WHEN the PIN resolution completes
- THEN the app navigates the guest to the voting view (`/voting`)
- AND the voting view's "Voten" tab is marked active
