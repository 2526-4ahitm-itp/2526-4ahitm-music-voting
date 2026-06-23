# Tasks

## 1. Infrastructure

- [x] 1.1 `MockURLProtocol.swift` — URLProtocol subclass intercepting `URLSession.shared` for unit tests

## 2. Tests

- [x] 2.1 `BackendConfigurationTests.swift` — `normalizedBaseURLString`, `endpoint`, `setBaseURLString`/`resetToDefault` (Swift Testing, serialized)
- [x] 2.2 `SongTests.swift` — id generation, uri, Equatable (Swift Testing)
- [x] 2.3 `GenerateQRCodeTests.swift` — non-nil output, scaling (Swift Testing)
- [x] 2.4 `PartySessionStoreTests.swift` — session CRUD, all network methods, sseEventsURL, partyURL (XCTest)
- [x] 2.5 `SongAddViewModelTests.swift` — queueSearch, search, loadQueue, addToPlaylist (XCTest)
- [x] 2.6 `AdminDashboardViewModelTests.swift` — progressFraction, loadQueue, loadCurrentPlayback, togglePlayPause, deleteSong, skip, restartCurrent (XCTest)
- [x] 2.7 `SpotifyAuthViewModelTests.swift` — loginURL, installationId, checkLoginStatus, handleCallback (XCTest)

## 3. Verification

- [x] 3.1 `xcodebuild test -only-testing:appTests` — 85/85 passing
