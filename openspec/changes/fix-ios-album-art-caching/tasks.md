# Tasks

## 1. Session image cache
- [x] 1.1 In `Model/Song.swift`, add `ImageCache.shared`: a thread-safe (`NSLock`) in-memory `[URL: UIImage]` store living for the app session
- [x] 1.2 In `Model/Song.swift`, derive `Song.id` from `uri` when available (fall back to `"\(title):\(artist)"`) for stable identity

## 2. Cached image view
- [x] 2.1 Add `CachedAsyncImage` (in `SongRow.swift`): loads via `URLSession.shared`, reads/writes `ImageCache.shared`, renders the caller's placeholder branch on nil/failure
- [x] 2.2 Replace `AsyncImage` with `CachedAsyncImage` in `SongRow.swift`, with a `music.note` placeholder
- [x] 2.3 Replace `AsyncImage` with `CachedAsyncImage` in `CurrentSongPlaying.swift`, with a `music.note` placeholder

## 3. Prefetch + render guards
- [x] 3.1 In the `AdminDashboard` view model, add `prefetchImages` and call it after `loadQueue` to warm the cache
- [x] 3.2 Add equality guards on `@Published` `isPlaying`, `deviceActive`, `currentPosition`, `currentDuration` so they are only reassigned when the value changes

## 4. Cleanup
- [x] 4.1 Delete the unused `views_content/dump/` folder

## 5. Tests
- [x] 5.1 Add unit tests for `ImageCache` (store/retrieve, shared instance)
- [x] 5.2 Add unit tests for the `@Published` equality guards (no reassignment on unchanged values)
- [x] 5.3 Add unit tests for prefetch behaviour
- [x] 5.4 Confirm the full iOS test suite passes (105 tests)

## 6. Verify
- [ ] 6.1 Manually verify on device/simulator: album art appears immediately in queue rows and the current-song view, with no flicker during polling, and the `music.note` placeholder shows for missing art

> Note: implementation landed in commit `a484d201`; tasks recorded retroactively. The unit tests (5.x) were run and pass; the manual on-device check (6.1) was not run in this session.
