# Δ host/spec.md

## ADDED Requirements

### Requirement: iOS Admin Album Art Loads Reliably via a Session Cache
The iOS admin dashboard MUST load album art through `URLSession.shared` and store fetched images in a session-scoped, thread-safe in-memory cache shared by every view (queue rows and the current-song view), rather than relying on `AsyncImage` (whose private URLSession ignores `URLCache.shared` on iOS 26). Once an image for a given URL has been fetched, subsequent views displaying the same URL MUST use the cached image without re-fetching. After the queue loads, the app MUST prefetch the queue's album-art URLs to warm the cache before the rows render.

#### Scenario: Album art is fetched once and reused
- GIVEN the iOS admin dashboard shows the same album art in the queue and in the current-song view
- WHEN both views display a track whose art URL has already been fetched
- THEN the image is served from the shared session cache
- AND no additional network request is made for that URL

#### Scenario: Art is ready when rows appear
- GIVEN the queue has just loaded with album-art URLs
- WHEN the queue rows render
- THEN their album art appears without a visible late-load flicker, because the URLs were prefetched into the cache

### Requirement: iOS Admin Shows a Placeholder When Album Art Is Missing
When a track has no album-art URL, or the image fails to load, the iOS admin dashboard MUST render a neutral placeholder showing a `music.note` symbol in place of the artwork, in both the queue rows and the current-song view.

#### Scenario: Track without album art
- GIVEN a queued track whose album-art URL is empty or fails to load
- WHEN its row or the current-song view renders
- THEN a placeholder with a `music.note` symbol is shown instead of artwork

### Requirement: iOS Admin Polling Does Not Cause Redundant Re-renders
The iOS admin dashboard polls playback state on a fixed interval. Polled `@Published` state (`isPlaying`, `deviceActive`, `currentPosition`, `currentDuration`) MUST only be reassigned when the newly polled value differs from the current value, so that SwiftUI does not re-render views when nothing has changed.

#### Scenario: Poll returns unchanged state
- GIVEN the iOS admin dashboard is polling and the playback state is unchanged between two polls
- WHEN the next poll completes with the same values
- THEN the `@Published` properties are not reassigned
- AND the views are not re-rendered for that poll
