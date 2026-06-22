import Combine
import XCTest
import Foundation
@testable import app

@MainActor
final class AdminDashboardViewModelTests: XCTestCase {

    private let sessionKeys = ["mv.party.id", "mv.party.pin", "mv.party.hostPin", "mv.party.role"]
    private var session: PartySessionStore!
    private var viewModel: AdminDashboardViewModel!
    private var cancellables: Set<AnyCancellable> = []

    override func setUp() {
        super.setUp()
        URLProtocol.registerClass(MockURLProtocol.self)
        MockURLProtocol.reset()
        BackendConfiguration.resetToDefault()
        sessionKeys.forEach { UserDefaults.standard.removeObject(forKey: $0) }

        session = PartySessionStore()
        session.setSession(id: "party-1", pin: "11111", hostPin: "HHHHH", role: .host)
        viewModel = AdminDashboardViewModel()
        viewModel.configure(partySession: session)
    }

    override func tearDown() {
        cancellables.removeAll()
        URLProtocol.unregisterClass(MockURLProtocol.self)
        MockURLProtocol.reset()
        URLCache.shared.removeAllCachedResponses()
        sessionKeys.forEach { UserDefaults.standard.removeObject(forKey: $0) }
        super.tearDown()
    }

    private func stubGet(_ path: String, json: String, statusCode: Int = 200) {
        let url = BackendConfiguration.endpoint("/api/party/party-1/\(path)").absoluteString
        MockURLProtocol.stubs[url] = .success(
            .init(statusCode: statusCode, body: Data(json.utf8),
                  headers: ["Content-Type": "application/json"])
        )
    }

    private func stubPost(_ path: String, json: String = "{}", statusCode: Int = 200) {
        let url = BackendConfiguration.endpoint("/api/party/party-1/\(path)").absoluteString
        MockURLProtocol.stubs[url] = .success(.init(statusCode: statusCode, body: Data(json.utf8)))
    }

    private func stubDelete(_ path: String, statusCode: Int = 200) {
        let url = BackendConfiguration.endpoint("/api/party/party-1/\(path)").absoluteString
        MockURLProtocol.stubs[url] = .success(.init(statusCode: statusCode, body: Data()))
    }

    private func stubError(_ path: String) {
        let url = BackendConfiguration.endpoint("/api/party/party-1/\(path)").absoluteString
        MockURLProtocol.stubs[url] = .failure(URLError(.notConnectedToInternet))
    }

    private let queueJSON = """
        {"queue":[
            {"name":"Song One","uri":"spotify:track:s1",
             "artists":[{"name":"Band A"}],
             "album":{"images":[{"url":"https://img/1"}]}},
            {"name":"Song Two","uri":"spotify:track:s2",
             "artists":[{"name":"Band B"}],
             "album":{"images":[]}}
        ]}
    """

    private let playbackJSON = """
        {"isPlaying":true,"track":
            {"name":"Now Playing","uri":"spotify:track:np",
             "artists":[{"name":"DJ"}],
             "album":{"images":[{"url":"https://img/np"}]}}
        }
    """

    // MARK: - progressFraction

    func testProgressFractionIsZeroWithNoDuration() {
        viewModel.currentPosition = 30_000
        viewModel.currentDuration = 0
        XCTAssertEqual(viewModel.progressFraction, 0)
    }

    func testProgressFractionIsClampedToOne() {
        viewModel.currentPosition = 400_000
        viewModel.currentDuration = 200_000
        XCTAssertEqual(viewModel.progressFraction, 1.0)
    }

    func testProgressFractionReturnsRatio() {
        viewModel.currentPosition = 50_000
        viewModel.currentDuration = 200_000
        XCTAssertEqual(viewModel.progressFraction, 0.25, accuracy: 0.001)
    }

    // MARK: - loadQueue

    func testLoadQueuePopulatesSongs() async {
        stubGet("track/queue", json: queueJSON)
        await viewModel.loadQueue()

        // loadQueue sets currentSong = allSongs.first before the party starts,
        // then excludes it from queueSongs — so only the second song appears.
        XCTAssertEqual(viewModel.currentSong?.title, "Song One")
        XCTAssertEqual(viewModel.queueSongs.count, 1)
        XCTAssertEqual(viewModel.queueSongs[0].title, "Song Two")
        XCTAssertEqual(viewModel.queueSongs[0].artist, "Band B")
        XCTAssertEqual(viewModel.queueSongs[0].uri, "spotify:track:s2")
    }

    func testLoadQueueSetsCurrentSongBeforePartyStarts() async {
        stubGet("track/queue", json: queueJSON)
        XCTAssertFalse(viewModel.partyStarted)
        await viewModel.loadQueue()

        XCTAssertEqual(viewModel.currentSong?.title, "Song One")
    }

    func testLoadQueueUpdatesPreviewToTopSongWhenPaused() async {
        // When nothing is playing, the preview always tracks the top-voted song —
        // even after the party has started (paused state).
        viewModel.partyStarted = true
        viewModel.isPlaying = false
        viewModel.currentSong = Song(title: "Old Preview", artist: "DJ", imageUrl: "", uri: "spotify:track:old")
        stubGet("track/queue", json: queueJSON)
        await viewModel.loadQueue()

        XCTAssertEqual(viewModel.currentSong?.title, "Song One")
    }

    func testLoadQueuePreservesCurrentSongWhilePlaying() async {
        // While a song is actively playing, loadQueue must not overwrite it
        // with whatever happens to be first in the queue response.
        viewModel.isPlaying = true
        viewModel.currentSong = Song(title: "Now Playing", artist: "DJ", imageUrl: "", uri: "spotify:track:np")
        stubGet("track/queue", json: queueJSON)
        await viewModel.loadQueue()

        XCTAssertEqual(viewModel.currentSong?.title, "Now Playing")
    }

    func testLoadQueueClearsQueueOnError() async {
        viewModel.queueSongs = [Song(title: "Stale", artist: "X", imageUrl: "")]
        stubError("track/queue")
        await viewModel.loadQueue()

        XCTAssertTrue(viewModel.queueSongs.isEmpty)
    }

    // MARK: - loadCurrentPlayback

    func testLoadCurrentPlaybackSetsTrackAndIsPlaying() async {
        stubGet("track/current", json: playbackJSON)
        await viewModel.loadCurrentPlayback()

        XCTAssertTrue(viewModel.isPlaying)
        XCTAssertEqual(viewModel.currentSong?.title, "Now Playing")
        XCTAssertEqual(viewModel.currentSong?.uri, "spotify:track:np")
    }

    func testLoadCurrentPlaybackWithNullTrackClearsPosition() async {
        viewModel.currentPosition = 30_000
        viewModel.currentDuration = 200_000
        stubGet("track/current", json: #"{"isPlaying":false,"track":null}"#)
        await viewModel.loadCurrentPlayback()

        XCTAssertFalse(viewModel.isPlaying)
        XCTAssertEqual(viewModel.currentPosition, 0)
        XCTAssertEqual(viewModel.currentDuration, 0)
    }

    func testLoadCurrentPlaybackKeepsLastKnownStateOnError() async {
        viewModel.isPlaying = true
        viewModel.currentSong = Song(title: "Last Known", artist: "X", imageUrl: "")
        stubError("track/current")
        await viewModel.loadCurrentPlayback()

        XCTAssertTrue(viewModel.isPlaying)
        XCTAssertEqual(viewModel.currentSong?.title, "Last Known")
    }

    // MARK: - togglePlayPause

    func testTogglePlayPauseStartsPartyWhenNotStarted() async {
        stubGet("track/queue", json: queueJSON)
        stubGet("track/current", json: playbackJSON)
        stubPost("track/start", json: #"{"status":"ok","track":null}"#)
        await viewModel.togglePlayPause()

        XCTAssertTrue(viewModel.partyStarted)
    }

    func testTogglePlayPausePausesWhenPlaying() async {
        viewModel.isPlaying = true
        viewModel.partyStarted = true
        stubGet("track/queue", json: queueJSON)
        stubGet("track/current", json: playbackJSON)
        stubPost("track/pause")
        await viewModel.togglePlayPause()

        XCTAssertFalse(viewModel.isPlaying)
    }

    func testTogglePlayPauseRevertsIsPlayingOnPauseFailure() async {
        viewModel.isPlaying = true
        viewModel.partyStarted = true
        stubError("track/pause")
        await viewModel.togglePlayPause()

        XCTAssertTrue(viewModel.isPlaying)
    }

    func testTogglePlayPauseResumesWhenPausedAfterPartyStarted() async {
        viewModel.isPlaying = false
        viewModel.partyStarted = true
        stubGet("track/queue", json: queueJSON)
        stubGet("track/current", json: playbackJSON)
        stubPost("track/resume")
        await viewModel.togglePlayPause()

        XCTAssertTrue(viewModel.isPlaying)
    }

    // MARK: - deleteSong / skip / restartCurrent

    func testDeleteSongDoesNothingForEmptyUri() async {
        await viewModel.deleteSong(uri: "")
        XCTAssertTrue(MockURLProtocol.requestedURLs.isEmpty)
    }

    func testDeleteSongSuccessReloadsQueue() async {
        stubGet("track/queue", json: #"{"queue":[]}"#)
        stubDelete("track/remove")
        await viewModel.deleteSong(uri: "spotify:track:s1")

        XCTAssertTrue(viewModel.queueSongs.isEmpty)
    }

    func testSkipSendsPostToNextEndpoint() async {
        stubGet("track/queue", json: #"{"queue":[]}"#)
        stubGet("track/current", json: #"{"isPlaying":true,"track":null}"#)
        stubPost("track/next")
        await viewModel.skip()

        XCTAssertFalse(viewModel.isLoading)
        XCTAssertTrue(MockURLProtocol.requestedURLs.map(\.absoluteString).contains { $0.hasSuffix("track/next") })
    }

    func testRestartCurrentDoesNothingWithoutCurrentSong() async {
        viewModel.currentSong = nil
        await viewModel.restartCurrent()
        XCTAssertTrue(MockURLProtocol.requestedURLs.isEmpty)
    }

    func testRestartCurrentSendsPutToPlayEndpoint() async {
        viewModel.currentSong = Song(title: "T", artist: "A", imageUrl: "", uri: "spotify:track:x1")
        let putURL = BackendConfiguration.endpoint("/api/party/party-1/track/play").absoluteString
        MockURLProtocol.stubs[putURL] = .success(.init(statusCode: 200, body: Data()))
        stubGet("track/queue", json: #"{"queue":[]}"#)
        stubGet("track/current", json: #"{"isPlaying":true,"track":null}"#)
        await viewModel.restartCurrent()

        XCTAssertFalse(viewModel.isLoading)
        XCTAssertTrue(MockURLProtocol.requestedURLs.map(\.absoluteString).contains { $0.hasSuffix("track/play") })
    }

    // MARK: - Equality guards (suppress unnecessary @Published fires)

    func testIsPlayingNotReassignedWhenValueUnchanged() async {
        viewModel.isPlaying = false
        var changeCount = 0
        viewModel.$isPlaying
            .dropFirst()
            .sink { _ in changeCount += 1 }
            .store(in: &cancellables)

        stubGet("track/current", json: #"{"isPlaying":false}"#)
        await viewModel.loadCurrentPlayback()

        XCTAssertEqual(changeCount, 0, "isPlaying should not publish when it stays false")
    }

    func testIsPlayingPublishesWhenValueChanges() async {
        viewModel.isPlaying = false
        var changeCount = 0
        viewModel.$isPlaying
            .dropFirst()
            .sink { _ in changeCount += 1 }
            .store(in: &cancellables)

        stubGet("track/current", json: playbackJSON) // isPlaying: true
        await viewModel.loadCurrentPlayback()

        XCTAssertEqual(changeCount, 1)
        XCTAssertTrue(viewModel.isPlaying)
    }

    func testDeviceActiveNotReassignedWhenValueUnchanged() async {
        viewModel.deviceActive = true
        var changeCount = 0
        viewModel.$deviceActive
            .dropFirst()
            .sink { _ in changeCount += 1 }
            .store(in: &cancellables)

        stubGet("track/current", json: #"{"isPlaying":false,"deviceActive":true}"#)
        await viewModel.loadCurrentPlayback()

        XCTAssertEqual(changeCount, 0, "deviceActive should not publish when it stays true")
    }

    func testDeviceActivePublishesWhenValueChanges() async {
        viewModel.deviceActive = true
        var changeCount = 0
        viewModel.$deviceActive
            .dropFirst()
            .sink { _ in changeCount += 1 }
            .store(in: &cancellables)

        stubGet("track/current", json: #"{"isPlaying":false,"deviceActive":false}"#)
        await viewModel.loadCurrentPlayback()

        XCTAssertEqual(changeCount, 1)
        XCTAssertFalse(viewModel.deviceActive)
    }

    // MARK: - Image prefetch

    func testLoadQueuePrefetchesUncachedImageUrls() async throws {
        let img1 = "https://cdn.example.com/art/1.jpg"
        let img2 = "https://cdn.example.com/art/2.jpg"
        let q = """
        {"queue":[
            {"name":"A","uri":"spotify:track:a1","artists":[{"name":"X"}],"album":{"images":[{"url":"\(img1)"}]}},
            {"name":"B","uri":"spotify:track:a2","artists":[{"name":"Y"}],"album":{"images":[{"url":"\(img2)"}]}}
        ]}
        """
        URLCache.shared.removeAllCachedResponses()
        stubGet("track/queue", json: q)

        await viewModel.loadQueue()
        // fire-and-forget dataTask requests need a moment to be dispatched
        try await Task.sleep(for: .milliseconds(50))

        let requested = Set(MockURLProtocol.requestedURLs.map(\.absoluteString))
        XCTAssertTrue(requested.contains(img1), "Should prefetch uncached image 1")
        XCTAssertTrue(requested.contains(img2), "Should prefetch uncached image 2")
    }

    func testLoadQueueSkipsAlreadyCachedImageUrls() async throws {
        let imgURL = URL(string: "https://cdn.example.com/art/cached.jpg")!
        // Pre-populate ImageCache.shared (the cache prefetchImages checks)
        ImageCache.shared.store(UIImage(), for: imgURL)

        let q = """
        {"queue":[
            {"name":"C","uri":"spotify:track:c1","artists":[{"name":"Z"}],"album":{"images":[{"url":"\(imgURL.absoluteString)"}]}}
        ]}
        """
        stubGet("track/queue", json: q)

        await viewModel.loadQueue()
        try await Task.sleep(for: .milliseconds(50))

        let requested = MockURLProtocol.requestedURLs.map(\.absoluteString)
        XCTAssertFalse(requested.contains(imgURL.absoluteString), "Already-cached image must not be re-fetched")
    }

    func testLoadQueueIgnoresSongsWithEmptyImageUrl() async throws {
        let q = """
        {"queue":[
            {"name":"NoArt","uri":"spotify:track:n1","artists":[{"name":"X"}],"album":{"images":[]}}
        ]}
        """
        URLCache.shared.removeAllCachedResponses()
        stubGet("track/queue", json: q)

        await viewModel.loadQueue()
        try await Task.sleep(for: .milliseconds(50))

        // Only the queue endpoint itself should have been requested; no image URL
        let imageRequests = MockURLProtocol.requestedURLs.filter { !$0.absoluteString.contains("/api/") }
        XCTAssertTrue(imageRequests.isEmpty, "No image prefetch for songs without artwork")
    }
}
