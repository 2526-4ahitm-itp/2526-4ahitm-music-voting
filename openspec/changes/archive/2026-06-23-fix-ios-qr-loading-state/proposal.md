# Proposal: iOS Admin Shows a Loading Indicator While the QR Code Fetches

## Intent

On the iOS admin dashboard, the QR code view started in a non-loading state, so before the QR image fetch completed it briefly showed an invisible "unavailable" placeholder rather than any feedback. The host saw an empty gap where the QR code should be until the request returned. The view should instead indicate that the QR code is loading from the moment the dashboard opens.

This change starts `QRCodeView` in its loading state so a spinner is shown immediately until `GET /api/party/{id}/qr` resolves, after which the QR image (or an error/unavailable state on failure) is shown.

## Scope

In scope (iOS app only):
- `QRCodeView.swift`: initialize the loading flag to `true` so the spinner is shown on first render, before the fetch completes.

Out of scope:
- The web host dashboard QR display (unchanged).
- The QR endpoint and how the image is generated (unchanged).
- The AdminDashboard gradient-background styling that shipped in the same commit (purely visual, no spec behavior).

## Approach

`QRCodeView` sets its `isLoadingQR` state to `true` at initialization. While loading, the view renders a progress spinner; on success it renders the fetched QR image; on failure it renders the existing unavailable/error state. This removes the brief invisible-placeholder flash between the view appearing and the fetch completing.
