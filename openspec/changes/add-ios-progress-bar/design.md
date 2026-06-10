# Design: iOS Host Synchronized Progress Bar

## Approach

Reuse the existing `progress` SSE relay end-to-end — no new endpoints, no new transport, no new dependency. The only backend gap is the event filter; everything else is iOS client work that mirrors the already-shipped web host dashboard.

## Backend — `SpotifyCallbackResource.events()`

The `ios` branch of the `/spotify/events` filter currently passes only `party-ended` and events matched by `installationId`. Extend it to also pass party-scoped events (`progress`, `queue-updated`, `track-changed`, `vote-updated`) when the connection's `partyId` query param matches the event payload's `partyId` — the same predicate the `web` branch already uses.

```java
if ("ios".equalsIgnoreCase(source) && installationId != null && !installationId.isBlank()) {
    final String id = installationId;
    final String iosPartyId = partyId == null ? "" : partyId.trim();
    return stream.select().where(event ->
            "party-ended".equals(event.type())
            || ("ios".equalsIgnoreCase(event.payload().get("source"))
                    && id.equals(event.payload().get("installationId")))
            || (("queue-updated".equals(event.type())
                || "track-changed".equals(event.type())
                || "vote-updated".equals(event.type())
                || "progress".equals(event.type()))
                && !iosPartyId.isBlank()
                && iosPartyId.equals(event.payload().get("partyId"))));
}
```

The `events()` method already accepts a `partyId` query param, so no signature change is needed. The change is purely additive: existing `party-ended` and `installationId`-targeted delivery is preserved.

## iOS — `PartySessionStore.sseEventsURL`

Add `partyId` to the query items so the backend can match party-scoped events:

```swift
URLQueryItem(name: "partyId", value: partyId)
```

Harmless for the existing `Admin_ContentView` / `Gast_ContentView` `party-ended` listeners (they ignore the extra param). Bind `partyId` via `guard let partyId else { return nil }`.

## iOS — `AdminDashboardViewModel`

- Add `@Published var currentPosition: Double = 0` and `@Published var currentDuration: Double = 0` (milliseconds) plus a `progressFraction` computed value (`min(position/duration, 1)`, `0` when duration ≤ 0).
- Add `listenForProgress()` — an SSE consumer mirroring the existing `Admin_ContentView.listenForPartyEnded()` pattern (`URLSession.bytes`, iterate `bytes.lines`, decode `data:` lines, reconnect on error with a 3 s backoff). It decodes `progress` events into a private `ProgressEvent { type, payload }` struct where `payload` holds `position` / `duration` / `paused` as optional strings, then updates the published position/duration.
- Start it from a dedicated `.task` in `AdminDashboard` (after `configure(partySession:)`).

Polling (`refreshDashboardState` every 2 s) is retained for queue/current-track/play-state; only the progress bar moves to SSE.

## iOS — `CurrentSongPlaying`

- Remove `@State private var progress` and the `Slider` + fixed `0:13` / `2:46` labels.
- Accept `positionMs` / `durationMs` (default `0`) and render an `HStack` of: position time, a `GeometryReader`-driven capsule bar (gray track + `Color("accent")` fill at `width = geo.width * fraction`), duration time. `Color("accent")` ≈ `#F2594B`, matching the web `.progress-fill`. Animate the fill `.linear(duration: 0.5)` to mirror the web `transition: width 0.5s linear`. Times format as `m:ss` via a local helper.

## Trade-offs / decisions

- **Why extend the existing filter instead of adding an iOS-specific event type?** The web relay already produces a party-scoped `progress` event; routing it to iOS is a filter concern, not a new event. Adding the other party-scoped events (`queue-updated`, etc.) to the iOS branch at the same time is low-risk and lets iOS later move off polling if desired.
- **Two SSE connections per iOS host (party-ended + progress).** Matches the existing codebase pattern (`Admin_ContentView` and `Gast_ContentView` each open their own). Consolidating is out of scope.
- **No reset on track change.** Like the web host dashboard, the bar simply waits for the next `progress` event; brief staleness between tracks is acceptable.
