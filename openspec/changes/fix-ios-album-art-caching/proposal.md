# Proposal: Reliable Album Art on iOS via a Session Image Cache

## Intent

On the iOS admin dashboard, album art frequently rendered late, flickered, or never appeared. The root cause: iOS 26's `AsyncImage` loads through a private `URLSession` that ignores `URLCache.shared`, so the app's attempts to pre-warm the shared cache had no effect, and every view re-fetched art independently. During the 2-second polling loop, unconditional reassignment of `@Published` playback state (`isPlaying`, `deviceActive`, `currentPosition`, `currentDuration`) also forced SwiftUI to re-render rows constantly, amplifying the flicker.

This change replaces `AsyncImage` with a custom `CachedAsyncImage` backed by a session-scoped `ImageCache` singleton over `URLSession.shared`, prefetches art after the queue loads so it is ready before rows render, shows a `music.note` placeholder when art is missing or fails, and adds equality guards on the polled `@Published` properties so SwiftUI only re-renders when a value actually changes.

## Scope

In scope (iOS app only):
- `Model/Song.swift`: add a thread-safe (NSLock) `ImageCache.shared` in-memory store; make `Song.id` derive from `uri` when available (stable identity for diffing/prefetch).
- `SongRow.swift` and `CurrentSongPlaying.swift`: replace `AsyncImage` with `CachedAsyncImage` (loads via `URLSession.shared`, reads/writes `ImageCache.shared`); show a `music.note` placeholder on missing/failed art.
- `AdminDashboard` view model: add `prefetchImages` to warm the cache after `loadQueue`; add equality guards on `@Published` `isPlaying` / `deviceActive` / `currentPosition` / `currentDuration` so polling doesn't trigger redundant re-renders.
- Remove the unused `views_content/dump/` scaffold folder.
- Unit tests covering the cache, the equality guards, and the prefetch behaviour.

Out of scope:
- Web frontend and backend — no changes; album-art URLs are unchanged.
- iOS guest views that do not display album art.
- Any change to the polling interval or the SSE/progress mechanism itself.

## Approach

`ImageCache.shared` is a singleton holding a `[URL: UIImage]` map guarded by an `NSLock`, living for the app session. `CachedAsyncImage` is a small SwiftUI view that, on a `.task(id: url)`, returns the cached `UIImage` if present, otherwise fetches via `URLSession.shared`, stores the result, and renders it; on `nil`/failure it renders the caller's placeholder branch. Both `SongRow` and `CurrentSongPlaying` adopt it. After `loadQueue`, the view model calls `prefetchImages` to populate `ImageCache.shared` for the queue's art URLs so the images are ready before the rows appear. Each `@Published` playback property is only reassigned when the new value differs from the current one, eliminating re-renders that the 2-second poll would otherwise cause.
