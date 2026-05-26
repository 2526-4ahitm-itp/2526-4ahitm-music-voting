# Delta for Host

## MODIFIED Requirements

### Requirement: Host Creates Party Before Provider Login
Before authenticating with a provider, the host MUST explicitly create a party by selecting the music provider on a dedicated "Party erstellen" screen. The system MUST call `POST /api/party` with the chosen provider and MUST store the returned party ID **and host token** for the duration of the session. Only after successful party creation does the host proceed to the provider OAuth login.

> Change: the `hostToken` returned by `POST /api/party` is now stored in `localStorage` (key `mv_host_token`) alongside the party ID.

#### Scenario: Host creates a party and host token is stored
- GIVEN the host opens the "Party erstellen" screen
- WHEN the host selects "Spotify" and confirms
- THEN `POST /api/party {"provider": "spotify"}` is called
- AND the returned `hostToken` is stored in `localStorage`
- AND the host is navigated to `/api/party/{id}/spotify/login`

## ADDED Requirements

### Requirement: Host Token Sent on All Outgoing Requests
The Angular frontend MUST include an `Authorization: Bearer <token>` header on every HTTP request to `/api/party/...` when a host token is stored. If no token is stored, the header MUST NOT be added.

#### Scenario: Host makes a playback control request
- GIVEN a host token is stored in `localStorage`
- WHEN the frontend calls `POST /api/party/{id}/track/pause`
- THEN the request includes `Authorization: Bearer <token>`

#### Scenario: Guest makes a vote request
- GIVEN no host token is stored in `localStorage` (guest session)
- WHEN the frontend calls `POST /api/party/{id}/track/vote`
- THEN the request does NOT include an `Authorization` header

### Requirement: Host Routes Require Stored Token
Angular routes `startpage`, `dashboard`, `voting-host`, and `search-host` MUST be protected by a route guard that verifies a host token exists in `localStorage`. If no token is found, the guard MUST redirect the user to the home page (`/`).

#### Scenario: Unauthenticated user navigates to dashboard
- GIVEN no host token is stored in `localStorage`
- WHEN the user navigates to `/dashboard`
- THEN the user is redirected to `/`

#### Scenario: Host navigates to dashboard with stored token
- GIVEN a host token is stored in `localStorage`
- WHEN the host navigates to `/dashboard`
- THEN the route is activated normally
