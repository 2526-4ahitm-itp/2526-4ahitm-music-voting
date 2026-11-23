## 1. Implementation

- [x] 1.1 Add `guestGuard` (`guest.guard.ts`): allow when `PartyService.currentPartyId` is set, else return a `UrlTree` to `/code`
- [x] 1.2 Register it as `canActivate` on the routes `voting` and `guest` in `app.routes.ts`

## 2. Tests

- [x] 2.1 `guest.guard.spec.ts`: allows with a stored party; redirects to `/code` without one
- [x] 2.2 `app.routes.spec.ts`: `voting` and `guest` are protected by `guestGuard`
- [x] 2.3 Run `npx ng test --watch=false --browsers=ChromeHeadless` in `musicvoting/frontend` — green

## 3. Verify

- [x] 3.1 Manual check on localhost: fresh browser (no storage) → `/voting` and `/guest` land on `/code`; after joining with a code, `/voting` opens and survives a reload
