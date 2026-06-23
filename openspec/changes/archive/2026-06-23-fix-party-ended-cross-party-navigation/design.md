# Design: Fix Party-Ended Cross-Party Navigation

## Approach

The `SpotifyCallbackResource.events()` method has two filter branches (`ios` and `web`). Both already extract `partyId` from the URL query string into a local final variable. The fix wraps the bare `"party-ended".equals(event.type())` condition with the partyId check that was already present for the other event types:

```java
// Before (both branches):
"party-ended".equals(event.type())

// After (both branches):
("party-ended".equals(event.type())
    && (xPartyId.isBlank() || xPartyId.equals(event.payload().get("partyId"))))
```

The `isBlank()` fallback ensures clients that open the SSE stream without a `partyId` query param (old/external clients) still receive `party-ended` events — backward compatible.

The `party-ended` payload already carries `partyId` (set by `PartyResource.end()` via `Map.of("partyId", id)`), so no backend change other than the filter is needed.

## Client-Side Defense-in-Depth

Both iOS SSE listeners (`Admin_ContentView.listenForPartyEnded()`, `Gast_ContentView.listenForPartyEnded()`) and the Angular host dashboard (`HostDashboard.startPartyEndedStream()`) add a `partyId` equality check before acting on the event. The `SSEEvent` decode struct is extended to include `payload: [String: String]?` so the partyId is accessible.

This guard is redundant when the backend filter is deployed but protects against stale/cached backend versions and future filter regressions.

## File Changes

- `musicvoting/backend/src/main/java/at/htl/endpoints/SpotifyCallbackResource.java` (modified)
- `musicvoting/frontend/src/app/pages/host-dashboard/host-dashboard.ts` (modified)
- `musicvoting/app/app/views_content/Admin_ContentView.swift` (modified)
- `musicvoting/app/app/views_content/Gast_ContentView.swift` (modified)
