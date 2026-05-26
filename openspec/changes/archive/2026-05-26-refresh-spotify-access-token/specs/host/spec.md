# Host Specification — Delta: Refresh Spotify Access Token

This delta adds one new requirement to the host spec. All existing requirements are unchanged.

---

### Requirement: Spotify Access Token Is Refreshed Automatically

The backend MUST automatically refresh the Spotify access token when it is about to expire or when Spotify returns HTTP 401, so that a party running longer than one hour continues to work without host intervention.

**Proactive refresh:** If the backend knows the token's expiry time and the token will expire within 60 seconds, the backend MUST refresh the token before sending the next Spotify API request.

**Reactive refresh:** If a Spotify API call returns HTTP 401, the backend MUST attempt to refresh the token once using the stored refresh token and retry the original request. The host MUST NOT be prompted to re-authenticate unless the refresh itself fails.

**Refresh failure:** If the refresh call fails (e.g. the refresh token is revoked), the backend MUST return a 401 response to the caller with the message `"Spotify-Sitzung abgelaufen. Bitte neu anmelden."`. The host must then restart the party and re-authenticate with Spotify.

#### Scenario: Token refreshed proactively before expiry

- GIVEN a party has been running for nearly 1 hour
- AND the backend knows the token expires in less than 60 seconds
- WHEN the host triggers any Spotify API call (search, play, pause, etc.)
- THEN the backend refreshes the token first
- AND the Spotify API call proceeds with the new token
- AND no error is visible to any client

#### Scenario: Token refreshed reactively on HTTP 401 from Spotify

- GIVEN a party's Spotify access token has expired
- WHEN the backend sends a Spotify API request and receives HTTP 401
- THEN the backend calls the Spotify token endpoint with the stored refresh token
- AND retries the original request with the new token
- AND the caller receives the successful response
- AND no error is visible to any client

#### Scenario: Refresh token is revoked — host must re-authenticate

- GIVEN the Spotify refresh token is invalid or revoked
- WHEN the backend attempts to refresh and the token endpoint returns an error
- THEN the backend returns HTTP 401 to the caller
- AND the response body contains `"Spotify-Sitzung abgelaufen. Bitte neu anmelden."`
