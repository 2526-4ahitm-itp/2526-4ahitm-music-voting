# Provider Specification

## Purpose

Defines how the system integrates with the two supported music providers (Spotify and YouTube): authentication, scope, and known functional limitations visible to users. Implementation details (library choice, token refresh strategy) belong in `design.md` of specific changes, not here.

## Requirements

### Requirement: Host Authenticates via Provider OAuth
When creating a party, the host MUST authenticate with the chosen provider through that provider's OAuth flow.

#### Scenario: Spotify OAuth during party creation
- GIVEN a host has selected Spotify during party creation
- WHEN the creation flow reaches the login step
- THEN the host is redirected to Spotify's OAuth consent screen
- AND successful consent binds the returned token to this party only

### Requirement: Provider Tokens Are Party-Scoped
Provider tokens issued to the host MUST be stored per-party and MUST be deleted when the party ends. Tokens MUST NOT be shared across parties.

#### Scenario: Tokens deleted on party end
- GIVEN a party bound to Spotify with a valid access token
- WHEN the host ends the party
- THEN the stored Spotify access and refresh tokens for that party are deleted

### Requirement: Spotify Provider Requires Premium Host Account
A party using Spotify MUST require the host's Spotify account to be a Premium account, because the provider's playback API is Premium-only.

#### Scenario: Non-Premium host attempts Spotify party
- GIVEN a host whose Spotify account is not Premium
- WHEN the host creates a Spotify-backed party and authenticates
- THEN playback fails or is refused by the provider
- AND the host sees a clear error indicating Premium is required

### Requirement: YouTube Ads Are Best-Effort Only
The system MUST NOT guarantee ad-free playback when YouTube is the provider. The stated goal is "no ads," delivered on a best-effort basis.

#### Scenario: Ad appears during YouTube playback
- GIVEN a YouTube-backed party is playing
- WHEN YouTube serves an advertisement before or during a video
- THEN the system does not promise suppression
- AND the ad plays through according to YouTube's own behavior
