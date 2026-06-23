# Proposal: Expand iOS Test Coverage

## Intent

The iOS Swift app had no meaningful automated tests — only a stub `example()` test. This change adds tests for all testable non-view logic in the app without changing any production behavior.

## Scope

In scope:
- `BackendConfigurationTests` (Swift Testing) — `normalizedBaseURLString` edge cases (empty, whitespace, IPv4, port, scheme stripping, credentials), `endpoint()`, `setBaseURLString`/`resetToDefault` persistence (13 tests)
- `SongTests` (Swift Testing) — id generation, uri default, Equatable (5 tests)
- `GenerateQRCodeTests` (Swift Testing) — non-nil output for valid/empty strings, image scaling (3 tests)
- `PartySessionStoreTests` (XCTest) — `setSession`/`updatePin`/`clear` UserDefaults persistence, `createParty`/`resolve`/`resolveAsHost`/`loadPartyDetails`/`endParty` success and error paths (404/400/network), `sseEventsURL`, `partyURL` (20 tests)
- `SongAddViewModelTests` (XCTest) — `queueSearch` min-length logic, `search` success/null-filter/error, `loadQueue` success/error, `addToPlaylist` success/error/idempotency (11 tests)
- `AdminDashboardViewModelTests` (XCTest) — `progressFraction`, `loadQueue`/`loadCurrentPlayback` response mapping, `togglePlayPause` state transitions (start/pause/resume + revert on failure), `deleteSong`, `skip`, `restartCurrent` (16 tests)
- `SpotifyAuthViewModelTests` (XCTest) — `loginURL`/installationId persistence, `checkLoginStatus` success/error, `handleCallback` branches (wrong scheme, with code → iOS login, without code → status fallback) (10 tests)
- `MockURLProtocol` helper — intercepts `URLSession.shared` requests via `URLProtocol.registerClass` so view models that call the backend directly can be tested without a live server

Out of scope:
- SwiftUI view rendering or navigation (no `ViewInspector` or UI automation)
- `listenForProgress`/`listenForQueueUpdates`/`listenForLoginSuccess` SSE streaming tests (long-running async byte streams; not unit-testable without refactoring URLSession injection)
- Any change to production behavior, models, or APIs

## Approach

Pure-logic structs/enums (`BackendConfiguration`, `Song`, `generateQRCode`) use Swift Testing (`@Test`, `#expect`) since they have no shared mutable state. Network-dependent `ObservableObject` view models and `PartySessionStore` use `XCTestCase` with `setUp`/`tearDown` because `MockURLProtocol.stubs` is a global dictionary and `setUp`/`tearDown` guarantee per-test cleanup where Swift Testing's struct `init()` does not.

`MockURLProtocol` is registered via `URLProtocol.registerClass` which intercepts `URLSession.shared` on the iOS simulator. UserDefaults keys (`mv.party.*`, `spotify.installation.id`) are wiped in `setUp`/`tearDown`. `BackendConfigurationTests` is marked `@Suite(.serialized)` to prevent intra-suite parallelism from corrupting `UserDefaults.standard` during the one test that temporarily sets a non-default base URL.

## Result

85/85 tests passing (`xcodebuild test -only-testing:appTests`)
