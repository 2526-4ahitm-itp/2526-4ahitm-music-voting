# Δ host/spec.md

## ADDED Requirements

### Requirement: iOS Admin Shows a Loading Indicator While the QR Code Fetches
The iOS admin dashboard MUST show a loading indicator (spinner) for the QR code from the moment the dashboard opens until `GET /api/party/{id}/qr` resolves, instead of an invisible or "unavailable" placeholder. On success the fetched QR image MUST be shown; on failure the unavailable/error state MUST be shown.

#### Scenario: QR code is still loading
- GIVEN the host opens the iOS admin dashboard for an active party
- WHEN the QR image request to `/api/party/{id}/qr` has not yet completed
- THEN a loading spinner is shown in the QR area
- AND no invisible or "unavailable" placeholder is shown in its place

#### Scenario: QR code finishes loading
- GIVEN the QR image request to `/api/party/{id}/qr` completes successfully
- WHEN the response is received
- THEN the QR code image is displayed in place of the spinner
