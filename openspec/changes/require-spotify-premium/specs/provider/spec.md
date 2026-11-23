# Spec Delta

## MODIFIED Requirements

### Requirement: Spotify Provider Requires Premium Host Account
A party using Spotify MUST require the host's Spotify account to be Premium, because the playback API is Premium-only. The system MUST check the account type right after the Spotify login. A login with an account known not to be Premium MUST NOT be accepted, and the host MUST see a clear message with a way to switch accounts. If the account type cannot be determined, the login MUST be accepted.

#### Scenario: Non-Premium host attempts Spotify party
- GIVEN a host whose Spotify account is not Premium
- WHEN the host creates a Spotify-backed party and authenticates
- THEN playback fails or is refused by the provider
- AND the host sees a clear error indicating Premium is required

#### Scenario: Web host logs in with a Free account
- **GIVEN** a host on the web who has created a Spotify party
- **WHEN** the host completes the Spotify login with an account whose type is not Premium
- **THEN** the party stores no Spotify tokens and no `login-success` event is emitted
- **AND** the host is redirected to the setup step with `error=premium-required`
- **AND** the page shows "Dein Spotify-Konto hat kein Premium. Für MusicVoting brauchst du Spotify Premium."
- **AND** offers the button "Mit anderem Spotify-Konto anmelden"

#### Scenario: Host switches to a different Spotify account
- **WHEN** the host presses "Mit anderem Spotify-Konto anmelden"
- **THEN** the Spotify login starts again with `switchAccount=true`
- **AND** Spotify shows its account selection dialog (`show_dialog=true`)

#### Scenario: iOS host logs in with a Free account
- **GIVEN** a host in the iOS app who has created a Spotify party
- **WHEN** the host completes the Spotify login with a non-Premium account
- **THEN** the backend rejects the login (redirect with `error=premium-required` or HTTP 403 with reason `PREMIUM_REQUIRED`)
- **AND** the app shows a localized Premium-required message instead of the generic sign-in error

#### Scenario: Account type cannot be determined
- **GIVEN** the account-type lookup fails (e.g. network error)
- **WHEN** the host completes the Spotify login
- **THEN** the login is accepted as before

#### Scenario: Spotify refuses a playback command because Premium is missing
- **GIVEN** Spotify answers a request with HTTP 403 and reason `PREMIUM_REQUIRED`
- **WHEN** the backend returns the error to the client
- **THEN** the error message is "Du brauchst Spotify Premium, um Musik abzuspielen."

#### Scenario: Web player reports an account error
- **GIVEN** the TV player (`/startpage`) runs the Spotify Web Playback SDK
- **WHEN** the SDK reports an `account_error`
- **THEN** the page shows "Wiedergabe nicht möglich: Das Spotify-Konto braucht Premium." visibly instead of only logging to the console
