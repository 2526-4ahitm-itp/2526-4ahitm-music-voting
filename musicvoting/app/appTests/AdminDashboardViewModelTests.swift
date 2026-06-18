import XCTest
import Foundation
@testable import app

@MainActor
final class AdminDashboardViewModelTests: XCTestCase {

    private let sessionKeys = ["mv.party.id", "mv.party.pin", "mv.party.hostPin", "mv.party.role"]
    private var session: PartySessionStore!
    private var viewModel: AdminDashboardViewModel!

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
        URLProtocol.unregisterClass(MockURLProtocol.self)
        MockURLProtocol.reset()
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

    func testLoadQueueDoesNotOverwriteCurrentSongAfterPartyStarted() async {
        stubGet("track/queue", json: queueJSON)
        viewModel.partyStarted = true
        viewModel.currentSong = Song(title: "Now Playing", artist: "DJ", imageUrl: "")
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
}
