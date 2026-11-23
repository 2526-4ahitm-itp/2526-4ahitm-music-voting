## MODIFIED Requirements

### Requirement: Host Sees PIN and QR Code After Creation
After a party is created, the host view MUST display the 5-digit PIN and a QR code image that guests can scan. The QR code MUST be loaded from `GET /api/party/{id}/qr`.

In all web host and TV views, the two codes MUST be named consistently and shown with different icons:
- The party PIN that guests use MUST be labelled "Voting-PIN".
- The host PIN MUST be labelled "Gastgeber-PIN" and carry the hint "Nicht weitergeben – damit öffnest du Dashboard und Player auf einem anderen Gerät."

The term "Host-PIN" MUST NOT appear in the web UI. The two codes MUST NOT share the same icon.

On the host dashboard the Gastgeber-PIN MUST be hidden by default and shown as "•••••", placed below the party actions. A button "Anzeigen" reveals it; while it is visible the button reads "Verbergen". The hint "Nicht weitergeben – damit öffnest du Dashboard und Player auf einem anderen Gerät." stays visible in both states. Every time the dashboard loads, the PIN starts hidden again.

#### Scenario: Host dashboard shows PIN and QR code
- GIVEN the host has just created a party
- WHEN the host dashboard loads
- THEN the PIN is visible as a large readable number labelled "Voting-PIN"
- AND a QR code image is displayed (loaded from `/api/party/{id}/qr`)
- AND scanning the QR code navigates to `/join/{pin}` in a guest browser

#### Scenario: Host sees the host PIN explained
- GIVEN the host is on the host dashboard
- WHEN the host looks for the host PIN
- THEN it is labelled "Gastgeber-PIN" with the hint "Nicht weitergeben – damit öffnest du Dashboard und Player auf einem anderen Gerät."
- AND it uses a different icon than the "Voting-PIN"

#### Scenario: Gastgeber-PIN is hidden until revealed
- GIVEN the host is on the host dashboard
- WHEN the dashboard loads
- THEN the Gastgeber-PIN shows "•••••" below the party actions, with the button "Anzeigen"
- WHEN the host chooses "Anzeigen"
- THEN the 5-digit Gastgeber-PIN is visible and the button reads "Verbergen"
- WHEN the host reloads the dashboard
- THEN the Gastgeber-PIN is hidden again

