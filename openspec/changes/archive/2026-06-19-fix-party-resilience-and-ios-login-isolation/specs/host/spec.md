# Delta for host

## ADDED Requirements

### Requirement: iOS Login Does Not Trigger Webapp Refresh
When a host authenticates via the iOS app, the backend MUST NOT emit a
`login-success` SSE event with `source=web`. Only an iOS-scoped event
(`source=ios`) MUST be emitted. This prevents the web app's SSE listener from
reinitializing its player in response to an iOS login.

#### Scenario: iOS host creates a party — webapp stays stable
- GIVEN the webapp has an active party open with its SSE stream connected
- WHEN the iOS host completes Spotify authentication for a new or existing party
- THEN the webapp does NOT receive a `login-success` event with `source=web`
- AND the webapp does NOT reinitialize or refresh its player

#### Scenario: Web login still triggers webapp initialization
- GIVEN the webapp is awaiting Spotify authentication
- WHEN the host completes Spotify authentication via the web flow
- THEN the webapp receives a `login-success` event with `source=web`
- AND the webapp initializes its player normally
