## Decisions

- **Check presence of a stored party ID, not its validity.** The guard is synchronous and makes no request. An ended or unknown party is already handled by the pages (`party-ended` SSE → goodbye screen; join errors on `/code`). Validating on every navigation would add a backend round trip to every tab switch between „Voten“ and „Hinzufügen“.
- **Read via `PartyService.currentPartyId`** (not `localStorage` directly as `hostGuard` does), so the guard follows the same source of truth as the pages, including an in-memory party set by `resolvePin` and a cleared one after `clearParty()`.
- **Redirect target `/code`**, not `/`: the person opening a guest URL is a guest; the code entry is the shortest way into a party. Returned as a `UrlTree` so the router performs the redirect without an extra navigation.
- **No PIN in guest URLs.** `/join/:pin` already is the shareable entry; adding `/voting/:pin` etc. would duplicate the join flow in several routes.
