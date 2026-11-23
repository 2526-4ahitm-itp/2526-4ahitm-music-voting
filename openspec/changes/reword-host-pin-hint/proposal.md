## Why

The hint under the Gastgeber-PIN on the host dashboard, „Geheim – damit kommst du zurück ins Dashboard.“, only says that the PIN brings the host back to the dashboard. The PIN is also what opens the player on the TV device (host options → „Player öffnen“), and „Geheim“ sounds stiff. The team wants a hint that says both what to do (don't share it) and what it is for.

## What Changes

- The hint becomes „Nicht weitergeben – damit öffnest du Dashboard und Player auf einem anderen Gerät.“ — on the dashboard and in the spec.
- Nothing else changes: label „Gastgeber-PIN“, hidden by default, „Anzeigen“/„Verbergen“.

## Capabilities

### Modified Capabilities
- `host`: new wording of the Gastgeber-PIN hint in "Host Sees PIN and QR Code After Creation".

## Impact

- Code: `musicvoting/frontend/src/app/pages/host-dashboard/host-dashboard.html`; tests in `host-stage-pages.dom.spec.ts`.
- Copy only, no behaviour change. iOS app not affected (it has its own strings).
