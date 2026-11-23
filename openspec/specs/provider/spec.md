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

### Requirement: YouTube Ads Are Best-Effort Only
The system MUST NOT guarantee ad-free playback when YouTube is the provider. The stated goal is "no ads," delivered on a best-effort basis.

#### Scenario: Ad appears during YouTube playback
- GIVEN a YouTube-backed party is playing
- WHEN YouTube serves an advertisement before or during a video
- THEN the system does not promise suppression
- AND the ad plays through according to YouTube's own behavior

### Requirement: Provider Lists Host Playlists and Supplies Refill Tracks
The music provider MUST be able to list the authenticated host's playlists, fetch the track URIs of a given playlist, and supply candidate track URIs for an empty-queue refill seeded by the currently playing track. For Spotify these map to `GET /v1/me/playlists`, `GET /v1/playlists/{id}/tracks`, and the recommendations seed lookup respectively, reusing the provider's existing authorized-request and token-refresh handling.

#### Scenario: List host playlists
- GIVEN an authenticated host for a party
- WHEN the provider lists the host's playlists
- THEN it returns the host's playlists with at least an id and name each

#### Scenario: Fetch playlist tracks for refill
- GIVEN a party whose default playlist is set to playlist P
- WHEN the provider fetches P's tracks for a refill
- THEN it returns the track URIs of P

#### Scenario: Default playlist read yields nothing falls through
- GIVEN a party with a default playlist set
- AND reading that playlist yields no tracks (transient error / unreadable / empty)
- WHEN the system refills the empty queue
- THEN it does NOT stop, but falls through to the next sources (similar → Top-Charts → search)
- AND adds a song so playback continues

### Requirement: Similar-Songs Refill Falls Back When Unavailable
When no default playlist is set, the empty-queue refill MUST source "similar" songs from the artists the party has played. Because Spotify's `/v1/recommendations` and related-artists endpoints are disabled for newer apps (404) and the artist endpoint no longer returns genres, the provider MUST approximate "similar" by rotating across the **top tracks of the artists added this party** (`/v1/artists/{id}/top-tracks`), varied (shuffled) so successive refills are not repetitive. The set of artists MUST grow as guests add songs by new artists.

The refill MUST try sources in this order, falling through on empty: (1) the default playlist if set; (2) similar songs (artist top-tracks); (3) a configured Top-Charts playlist; (4) a **search fallback**. Each step is best-effort — failures or empty results fall through to the next.

#### Scenario: Similar songs vary across the party's artists
- GIVEN no default playlist is set
- AND guests have added songs by artists A and B
- WHEN the system refills the empty queue over several songs
- THEN it draws candidate songs from the top tracks of A and B (not only the last-played artist)

#### Scenario: Similar lookup unavailable falls back to Top-Charts
- GIVEN no default playlist is set
- AND the similar-songs lookup fails or is unavailable
- WHEN the system refills the empty queue
- THEN it draws candidate songs from the configured Top-Charts playlist instead

### Requirement: Search-Based Refill Backstop Guarantees a Next Song
When the default-playlist, similar-songs, and Top-Charts sources all yield nothing, the provider MUST fall back to Spotify's `GET /v1/search` (which remains available to the app, unlike the recommendation and editorial-playlist endpoints). The provider MUST first search for tracks by the currently playing song's primary artist, and if that yields nothing, MUST issue a broad query over the current year and the 15 years before it. Results MUST be shuffled. This guarantees there is always a next song to refill with as long as Spotify is reachable; the refill produces no songs only when search itself fails (e.g. no network), in which case playback stops per `playback/spec.md`.

#### Scenario: All playlist/similar sources empty, search by artist succeeds
- GIVEN no default playlist is set
- AND the similar-songs and Top-Charts sources yield nothing
- WHEN the system refills the empty queue
- THEN it searches for tracks by the currently playing song's artist
- AND adds a track from those results so playback continues

#### Scenario: Artist search empty, broad search backstops
- GIVEN the artist search yields nothing (e.g. the current song has no usable artist)
- WHEN the system refills the empty queue
- THEN it issues a broad search query
- AND adds a track from those results

#### Scenario: Broad search covers the last 15 years up to now
- **GIVEN** the current year is 2026
- **WHEN** the provider issues the broad search query
- **THEN** the query is `year:2011-2026`
- **AND** in a later year the range moves along without a code change

#### Scenario: Search itself unavailable
- GIVEN no default playlist is set
- AND every source including search yields no songs (e.g. Spotify is unreachable)
- WHEN the system attempts to refill
- THEN no songs are added

### Requirement: System Does Not Create or Modify Playlists in the Host's Account
The system MUST NOT create, rename, fill or otherwise modify playlists in the host's provider account. It MAY only read the host's playlists (to offer a default playlist and to refill the queue). The provider OAuth flow MUST request only the permissions needed for playback and for reading playlists; for Spotify it MUST NOT request `playlist-modify-private` or `playlist-modify-public`.

#### Scenario: Host logs in without a default playlist
- **GIVEN** a host whose Spotify account has no playlist named "Musicvoting party"
- **WHEN** the host completes the Spotify login for a party (web or iOS)
- **THEN** no playlist is created in the host's Spotify account
- **AND** the host's existing playlists are unchanged

#### Scenario: Queue is refilled without a default playlist
- **GIVEN** a party without a default playlist whose last queued song is playing
- **WHEN** the system refills the queue
- **THEN** no playlist is created or looked up by name in the host's account
- **AND** the refill continues with similar songs → Top-Charts → search as defined in "Similar-Songs Refill Falls Back When Unavailable"

#### Scenario: OAuth consent asks only for needed permissions
- **WHEN** the host is redirected to Spotify's OAuth consent screen
- **THEN** the requested scopes include `playlist-read-private`
- **AND** they do not include `playlist-modify-private` or `playlist-modify-public`
