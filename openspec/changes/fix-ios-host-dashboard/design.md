# Design: Fix iOS Host Dashboard Controls and UX

## Authorization Header

A single private helper in `AdminDashboardViewModel` builds every outgoing `URLRequest`:

```swift
private func hostAuthorizedRequest(url: URL, method: String) -> URLRequest {
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    if let pin = partySession?.hostPin {
        request.setValue("Bearer \(pin)", forHTTPHeaderField: "Authorization")
    }
    return request
}
```

`performPostRequest`, `performPostRequest<T>`, `performPutRequest`, and `deleteSong` all delegate to this helper. This matches what Angular's `HostAuthInterceptor` does for the web client.

## Play/Pause Toggle Fix

Before the queue-preview feature, `currentSong` was `nil` before the first play. `togglePlayPause()` used `currentSong != nil` to distinguish "nothing has started yet" (call `/track/start`) from "paused mid-song" (call `/track/resume`). The preview feature sets `currentSong` from the queue, breaking that assumption.

Fix: replace `currentSong != nil` with `partyStarted`. `partyStarted` is set to `true` only inside `startPlaylist()` and is never reset to `false`, mirroring the webapp's `if (!this.partyStarted)` guard.

## Track-Changed Reset in listenForProgress()

The `listenForProgress()` SSE loop already receives `track-changed` events (added to the iOS SSE filter in `add-ios-progress-bar`). Previously it skipped them. Now:

```swift
} else if event.type == "track-changed" {
    currentPosition = 0
    currentDuration = 0
    await refreshDashboardState()
}
```

This resets the bar immediately when a track change is detected and fetches the new current track without waiting for the 2-second poll timer.

## loadCurrentPlayback Position Reset

When `response.track == nil` (nothing playing), `currentPosition` and `currentDuration` are set to `0`. This clears stale values from a previous session when the dashboard is opened with no active playback.

## Host PIN Entry Digit-Box UI

`HostPinEntryView` is rewritten to share the pattern from `CodeInputView`:
- A zero-size hidden `TextField` captures keyboard input
- Five `RoundedRectangle` boxes render individual digits
- `onChange` caps input to digits only; auto-submits when all 5 are filled
- Error path: `UINotificationFeedbackGenerator` haptic + `ShakeEffect` animation (defined in `CodeInputView.swift`, accessible across the module)

The gradient background, note image, "Dashboard öffnen" heading, and back-to-`.hostMenu` navigation are preserved unchanged.

## Search Null Track Handling

```swift
private struct TrackContainer: Decodable {
    let items: [TrackItem?]   // optional to absorb null entries
}
// …
results = decoded.tracks.items.compactMap { $0 }.map(Self.mapTrackToSearch)
```

HTTP status is checked before decode:
```swift
guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
    errorMessage = "Suche fehlgeschlagen. Bitte erneut versuchen."
    return
}
```

This separates "backend unreachable" (network error → catch) from "backend returned an error" (non-2xx → guard).

## File Changes

- `musicvoting/app/app/views_content/views/AdminDash/AdminDashboard.swift` (modified)
- `musicvoting/app/app/views_content/views/HostPinEntryView.swift` (modified)
- `musicvoting/app/app/views_content/views/SongAddView.swift` (modified)
