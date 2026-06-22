import XCTest
import Foundation
@testable import app

@MainActor
final class VotingViewModelTests: XCTestCase {

    private let sessionKeys = ["mv.party.id", "mv.party.pin", "mv.party.hostPin", "mv.party.role",
                               "spotify.installation.id"]
    private var session: PartySessionStore!
    private var viewModel: VotingViewModel!

    override func setUp() {
        super.setUp()
        URLProtocol.registerClass(MockURLProtocol.self)
        MockURLProtocol.reset()
        BackendConfiguration.resetToDefault()
        sessionKeys.forEach { UserDefaults.standard.removeObject(forKey: $0) }

        UserDefaults.standard.set("test-device-id", forKey: "spotify.installation.id")
        session = PartySessionStore()
        session.setSession(id: "party-1", pin: "11111", role: .guest)
        viewModel = VotingViewModel()
        viewModel.configure(partySession: session)
    }

    override func tearDown() {
        URLProtocol.unregisterClass(MockURLProtocol.self)
        MockURLProtocol.reset()
        sessionKeys.forEach { UserDefaults.standard.removeObject(forKey: $0) }
        super.tearDown()
    }

    // MARK: - Helpers

    private func queueBaseURL() -> String {
        BackendConfiguration.endpoint("/api/party/party-1/track/queue").absoluteString
    }

    private func voteURL() -> String {
        BackendConfiguration.endpoint("/api/party/party-1/track/vote").absoluteString
    }

    private func stubQueue(entries: [(id: String, uri: String, likeCount: Int, hasVoted: Bool, isCurrentlyPlaying: Bool)] = []) {
        let items = entries.map { e in
            """
            {"id":"\(e.id)","uri":"\(e.uri)","name":"Track \(e.id)",\
            "artists":[{"name":"Artist"}],"album":{"images":[]},\
            "likeCount":\(e.likeCount),"hasVoted":\(e.hasVoted),\
            "isCurrentlyPlaying":\(e.isCurrentlyPlaying)}
            """
        }.joined(separator: ",")
        let json = "{\"queue\":[\(items)]}"
        MockURLProtocol.stubs[queueBaseURL() + "?deviceId=test-device-id"] = .success(
            .init(statusCode: 200, body: Data(json.utf8), headers: ["Content-Type": "application/json"])
        )
    }

    private func stubVote(liked: Bool, likeCount: Int, statusCode: Int = 200) {
        let json = "{\"liked\":\(liked),\"likeCount\":\(likeCount)}"
        MockURLProtocol.stubs[voteURL()] = .success(
            .init(statusCode: statusCode, body: Data(json.utf8), headers: ["Content-Type": "application/json"])
        )
    }

    private func makeEntry(id: String = "e1", uri: String = "spotify:track:t1",
                           likeCount: Int = 0, hasVoted: Bool = false,
                           isCurrentlyPlaying: Bool = false) -> VotingEntry {
        VotingEntry(id: id, uri: uri, title: "Track", artist: "Artist",
                    imageUrl: "https://img", likeCount: likeCount, hasVoted: hasVoted,
                    isCurrentlyPlaying: isCurrentlyPlaying)
    }

    // MARK: - loadQueue

    func testLoadQueuePopulatesEntries() async {
        stubQueue(entries: [
            (id: "e1", uri: "spotify:track:a", likeCount: 3, hasVoted: true,  isCurrentlyPlaying: true),
            (id: "e2", uri: "spotify:track:b", likeCount: 0, hasVoted: false, isCurrentlyPlaying: false),
        ])

        await viewModel.loadQueue()

        XCTAssertEqual(viewModel.entries.count, 2)
        XCTAssertEqual(viewModel.entries[0].uri, "spotify:track:a")
        XCTAssertEqual(viewModel.entries[0].likeCount, 3)
        XCTAssertTrue(viewModel.entries[0].hasVoted)
        XCTAssertTrue(viewModel.entries[0].isCurrentlyPlaying)
        XCTAssertEqual(viewModel.entries[1].uri, "spotify:track:b")
        XCTAssertFalse(viewModel.entries[1].hasVoted)
        XCTAssertFalse(viewModel.entries[1].isCurrentlyPlaying)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testLoadQueuePassesDeviceIdToBackend() async {
        stubQueue()

        await viewModel.loadQueue()

        let requestedURL = MockURLProtocol.requestedURLs.first?.absoluteString ?? ""
        XCTAssertTrue(requestedURL.contains("deviceId=test-device-id"),
                      "Expected deviceId in request URL, got: \(requestedURL)")
    }

    func testLoadQueueSetsEmptyEntriesOnEmptyQueue() async {
        stubQueue(entries: [])

        await viewModel.loadQueue()

        XCTAssertTrue(viewModel.entries.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testLoadQueueKeepsPreviousEntriesOnNetworkError() async {
        viewModel.entries = [makeEntry()]
        MockURLProtocol.stubs[queueBaseURL() + "?deviceId=test-device-id"] = .failure(URLError(.timedOut))

        await viewModel.loadQueue()

        XCTAssertEqual(viewModel.entries.count, 1)
    }

    // MARK: - toggleVote

    func testToggleVoteSuccessUpdatesEntryFromServerResponse() async {
        viewModel.entries = [makeEntry(likeCount: 0, hasVoted: false)]
        stubVote(liked: true, likeCount: 1)

        await viewModel.toggleVote(entry: viewModel.entries[0])

        XCTAssertTrue(viewModel.entries[0].hasVoted)
        XCTAssertEqual(viewModel.entries[0].likeCount, 1)
    }

    func testToggleVoteUnlikeUpdatesEntryFromServerResponse() async {
        viewModel.entries = [makeEntry(likeCount: 1, hasVoted: true)]
        stubVote(liked: false, likeCount: 0)

        await viewModel.toggleVote(entry: viewModel.entries[0])

        XCTAssertFalse(viewModel.entries[0].hasVoted)
        XCTAssertEqual(viewModel.entries[0].likeCount, 0)
    }

    func testToggleVoteRevertsOptimisticUpdateOnServerError() async {
        viewModel.entries = [makeEntry(likeCount: 2, hasVoted: false)]
        stubVote(liked: true, likeCount: 3, statusCode: 500)

        await viewModel.toggleVote(entry: viewModel.entries[0])

        XCTAssertFalse(viewModel.entries[0].hasVoted)
        XCTAssertEqual(viewModel.entries[0].likeCount, 2)
    }

    func testToggleVoteRevertsOnNetworkError() async {
        viewModel.entries = [makeEntry(likeCount: 1, hasVoted: true)]
        MockURLProtocol.stubs[voteURL()] = .failure(URLError(.notConnectedToInternet))

        await viewModel.toggleVote(entry: viewModel.entries[0])

        XCTAssertTrue(viewModel.entries[0].hasVoted)
        XCTAssertEqual(viewModel.entries[0].likeCount, 1)
    }

    func testToggleVoteClearsVotingIdAfterCompletion() async {
        viewModel.entries = [makeEntry()]
        stubVote(liked: true, likeCount: 1)

        await viewModel.toggleVote(entry: viewModel.entries[0])

        XCTAssertTrue(viewModel.votingIds.isEmpty)
    }

    func testToggleVotePostsCorrectBody() async {
        viewModel.entries = [makeEntry(uri: "spotify:track:xyz")]
        stubVote(liked: true, likeCount: 1)

        await viewModel.toggleVote(entry: viewModel.entries[0])

        let requestedURL = MockURLProtocol.requestedURLs.last?.absoluteString ?? ""
        XCTAssertTrue(requestedURL.hasSuffix("/track/vote"))
    }
}
