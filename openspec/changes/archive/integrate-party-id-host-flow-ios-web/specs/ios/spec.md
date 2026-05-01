# Delta for iOS

## ADDED Requirements

### Requirement: iOS Host Choice Screen
The iOS app MUST present a dedicated host choice screen between the start screen and the Spotify auth / dashboard. This screen MUST offer exactly two buttons: "Party erstellen" and "Dashboard öffnen".

#### Scenario: Host choice screen appears after tapping "Gastgeber"
- GIVEN the user is on the iOS start screen
- WHEN the user taps "Gastgeber auf einer Party"
- THEN the host choice screen is shown
- AND two buttons are visible: "Party erstellen" and "Dashboard öffnen"

### Requirement: iOS "Party erstellen" Flow
Tapping "Party erstellen" MUST call `POST /api/party` to create the party, store the result in `PartySessionStore`, then navigate to the Spotify auth screen. The Spotify auth screen MUST NOT be reachable without a party ID already in the session on this path.

#### Scenario: Party is created before Spotify auth
- GIVEN the host is on the iOS host choice screen
- WHEN the host taps "Party erstellen"
- THEN `POST /api/party {"provider": "spotify"}` is called
- AND on success the party `id` and `pin` are stored in `PartySessionStore` with role `host`
- AND the app navigates to the Spotify auth screen

#### Scenario: Party creation error is shown
- GIVEN the host taps "Party erstellen" but the backend returns an error
- THEN an error message is shown on the host choice screen
- AND the host remains on the host choice screen

### Requirement: iOS "Dashboard öffnen" Flow
Tapping "Dashboard öffnen" MUST navigate to a PIN entry screen. On valid PIN submission the party ID is resolved and stored in `PartySessionStore` with role `host`. The app then navigates to the admin dashboard.

#### Scenario: Successful PIN entry opens dashboard
- GIVEN the host is on the iOS PIN entry screen
- WHEN the host enters a valid 5-digit PIN and confirms
- THEN `GET /api/party/join/{pin}` is called
- AND the returned `id` is stored in `PartySessionStore` with role `host` and the entered PIN
- AND the app navigates to the iOS admin dashboard

### Requirement: iOS AppState Extended for Host Flow
`AppState.SiteState` MUST include `hostMenu` and `hostPinEntry` cases to support the new host navigation steps.

#### Scenario: Navigation from start to host choice
- GIVEN `appState.currentSite == .start`
- WHEN the host taps "Gastgeber auf einer Party"
- THEN `appState.currentSite` is set to `.hostMenu`

#### Scenario: Navigation from host menu to PIN entry
- GIVEN `appState.currentSite == .hostMenu`
- WHEN the host taps "Dashboard öffnen"
- THEN `appState.currentSite` is set to `.hostPinEntry`
