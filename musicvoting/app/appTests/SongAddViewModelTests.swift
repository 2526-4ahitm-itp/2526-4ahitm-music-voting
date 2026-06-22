import XCTest
import Foundation
@testable import app

@MainActor
final class SongAddViewModelTests: XCTestCase {

    private let sessionKeys = ["mv.party.id", "mv.party.pin", "mv.party.hostPin", "mv.party.role"]
    private var session: PartySessionStore!
    private var viewModel: SongAddViewModel!

    override func setUp() {
        super.setUp()
        URLProtocol.registerClass(MockURLProtocol.self)
        MockURLProtocol.reset()
        BackendConfiguration.resetToDefault()
        sessionKeys.forEach { UserDefaults.standard.removeObject(forKey: $0) }

        session = PartySessionStore()
        session.setSession(id: "party-1", pin: "11111", role: .guest)
        viewModel = SongAddViewModel()
        viewModel.configure(partySession: session)
    }

    override func tearDown() {
        URLProtocol.unregisterClass(MockURLProtocol.self)
        MockURLProtocol.reset()
        sessionKeys.forEach { UserDefaults.standard.removeObject(forKey: $0) }
        super.tearDown()
    }

    private func stubSearch(json: String, statusCode: Int = 200) {
        let base = BackendConfiguration.endpoint("/api/party/party-1/track/search").absoluteString
        MockURLProtocol.stubs[base + "?q=test"] = .success(
            .init(statusCode: statusCode, body: Data(json.utf8),
                  headers: ["Content-Type": "application/json"])
        )
    }

    private func stubAddToPlaylist(statusCode: Int = 200) {
        let url = BackendConfiguration.endpoint("/api/party/party-1/track/addToPlaylist").absoluteString
        MockURLProtocol.stubs[url] = .success(.init(statusCode: statusCode, body: Data()))
    }

    private func stubQueue(json: String = #"{"queue":[]}"#) {
        let url = BackendConfiguration.endpoint("/api/party/party-1/track/queue").absoluteString
        MockURLProtocol.stubs[url] = .success(
            .init(statusCode: 200, body: Data(json.utf8), headers: ["Content-Type": "application/json"])
        )
    }

    private func makeTrack(id: String = "t1", uri: String = "spotify:track:t1") -> SearchTrack {
        SearchTrack(id: id, uri: uri, title: "Track \(id)", artist: "Artist", imageUrl: "https://img")
    }

    // MARK: - queueSearch

    func testQueueSearchClearsResultsForShortQuery() {
        viewModel.results = [makeTrack()]
        viewModel.queueSearch(for: "a")
        XCTAssertTrue(viewModel.results.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testQueueSearchClearsResultsForEmptyQuery() {
        viewModel.results = [makeTrack()]
        viewModel.queueSearch(for: "")
        XCTAssertTrue(viewModel.results.isEmpty)
    }

    // MARK: - search

    func testSearchPopulatesResults() async {
        stubSearch(json: """
            {"tracks":{"items":[
                {"id":"t1","uri":"spotify:track:t1","name":"Track One",
                 "artists":[{"name":"Artist A"}],
                 "album":{"images":[{"url":"https://img/1"}]}}
            ]}}
        """)
        await viewModel.search(query: "test")

        XCTAssertEqual(viewModel.results.count, 1)
        XCTAssertEqual(viewModel.results[0].title, "Track One")
        XCTAssertEqual(viewModel.results[0].artist, "Artist A")
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testSearchFiltersOutNullItems() async {
        stubSearch(json: """
            {"tracks":{"items":[null,
                {"id":"t2","uri":"spotify:track:t2","name":"Track Two",
                 "artists":[],"album":{"images":[]}}
            ]}}
        """)
        await viewModel.search(query: "test")

        // null items are filtered out; the non-null item with no artists falls back
        // to the localized "unknown" artist placeholder (locale-independent: just not empty).
        XCTAssertEqual(viewModel.results.count, 1)
        XCTAssertEqual(viewModel.results[0].title, "Track Two")
        XCTAssertFalse(viewModel.results[0].artist.isEmpty)
    }

    func testSearchSetsErrorOnNon2xxResponse() async {
        stubSearch(json: "", statusCode: 500)
        await viewModel.search(query: "test")

        XCTAssertTrue(viewModel.results.isEmpty)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testSearchSetsErrorOnNetworkError() async {
        let url = BackendConfiguration.endpoint("/api/party/party-1/track/search").absoluteString + "?q=test"
        MockURLProtocol.stubs[url] = .failure(URLError(.notConnectedToInternet))
        await viewModel.search(query: "test")

        XCTAssertTrue(viewModel.results.isEmpty)
        XCTAssertNotNil(viewModel.errorMessage)
    }

    // MARK: - loadQueue

    func testLoadQueuePopulatesQueuedTrackUris() async {
        stubQueue(json: """
            {"queue":[{"uri":"spotify:track:aaa"},{"uri":"spotify:track:bbb"},{"uri":null}]}
        """)
        await viewModel.loadQueue()

        XCTAssertEqual(viewModel.queuedTrackUris, ["spotify:track:aaa", "spotify:track:bbb"])
    }

    func testLoadQueueKeepsPreviousStateOnError() async {
        viewModel.queuedTrackUris = ["spotify:track:existing"]
        let url = BackendConfiguration.endpoint("/api/party/party-1/track/queue").absoluteString
        MockURLProtocol.stubs[url] = .failure(URLError(.timedOut))
        await viewModel.loadQueue()

        XCTAssertEqual(viewModel.queuedTrackUris, ["spotify:track:existing"])
    }

    // MARK: - addToPlaylist

    func testAddToPlaylistSuccessMarksTrackAsAdded() async {
        stubAddToPlaylist()
        stubQueue()
        let track = makeTrack()
        await viewModel.addToPlaylist(track)

        XCTAssertTrue(viewModel.addedTrackIds.contains("t1"))
        XCTAssertFalse(viewModel.addingTrackIds.contains("t1"))
    }

    func testAddToPlaylistSetsErrorOnFailure() async {
        stubAddToPlaylist(statusCode: 409)
        let track = makeTrack()
        await viewModel.addToPlaylist(track)

        XCTAssertFalse(viewModel.addedTrackIds.contains("t1"))
        XCTAssertNotNil(viewModel.errorMessage)
    }

    func testAddToPlaylistIsIdempotentForAlreadyAddedTrack() async {
        let track = makeTrack()
        viewModel.addedTrackIds.insert("t1")
        await viewModel.addToPlaylist(track)

        XCTAssertTrue(MockURLProtocol.requestedURLs.isEmpty)
    }
}
