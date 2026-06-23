# Proposal: Fix Party-Ended Cross-Party Navigation

## Intent

When any party was ended, every connected SSE client — regardless of which party they were in — received the `party-ended` event and navigated back to the start page. This caused unrelated parties to be disrupted whenever the host app ended its own party. The root cause was that both the iOS and web SSE filter branches passed `party-ended` events with no `partyId` guard, while all other party-scoped events (`progress`, `queue-updated`, etc.) were already correctly scoped.

## Scope

In scope:
- Scope `party-ended` delivery in the backend iOS SSE filter to the subscribing client's `partyId`
- Scope `party-ended` delivery in the backend web SSE filter to the subscribing client's `partyId`
- Add client-side `partyId` guard in the Angular host dashboard SSE handler
- Add client-side `partyId` guard in the iOS admin and guest SSE listeners

Out of scope:
- Changes to how `party-ended` is emitted or when it fires
- Any other event type's scoping (already correct)
- Guest web view party-ended handling (no web guest SSE listener)

## Approach

The fix is additive and symmetric. In `SpotifyCallbackResource.events()`, both the `ios` and `web` filter branches already capture `partyId` from the query string into a local variable (`iosPartyId` / `webPartyId`). The `party-ended` condition simply needs to be wrapped with the same partyId equality check already used for the other event types. A blank-partyId fallback preserves backward compatibility for clients that do not supply `partyId`. Client-side guards in `Admin_ContentView`, `Gast_ContentView`, and `host-dashboard.ts` add defense-in-depth by checking `payload.partyId` against the stored session partyId before acting.
