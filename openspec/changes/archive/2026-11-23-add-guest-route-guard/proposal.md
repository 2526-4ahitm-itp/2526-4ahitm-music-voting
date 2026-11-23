## Why

The guest pages `/voting` and `/guest` take the party from the browser storage (`mv_party_id`, written by `PartyService` when a PIN is resolved via `/join/:pin` or `/code`). The URL itself carries no party. Opening `/voting` or `/guest` directly without having joined (a bookmarked link, a shared URL, after leaving or after the party ended) shows a page whose requests have no party to talk to — the guest sees an empty, broken view instead of a way to join. The host pages already have `hostGuard`; the guest pages have nothing.

## What Changes

- New `guestGuard` on the routes `voting` and `guest`: if no party ID is stored, the guest is redirected to `/code` (enter the 5-digit code); otherwise the route opens as before.
- The PIN stays out of the guest URLs — `/join/:pin` (QR code) remains the only entry with a PIN.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `guest`: guest views require a joined party and send the guest to the code entry otherwise.

## Impact

- Code: new `musicvoting/frontend/src/app/guest.guard.ts` + `guest.guard.spec.ts`; `app.routes.ts` (+ `app.routes.spec.ts`).
- No backend, API or iOS changes. Host routes and `hostGuard` unchanged.
