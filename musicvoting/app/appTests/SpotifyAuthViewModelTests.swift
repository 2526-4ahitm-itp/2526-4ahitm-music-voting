import XCTest
import Foundation
@testable import app

@MainActor
final class SpotifyAuthViewModelTests: XCTestCase {

    private var viewModel: SpotifyAuthViewModel!

    override func setUp() {
        super.setUp()
        URLProtocol.registerClass(MockURLProtocol.self)
        MockURLProtocol.reset()
        BackendConfiguration.resetToDefault()
        UserDefaults.standard.removeObject(forKey: "spotify.installation.id")

        viewModel = SpotifyAuthViewModel()
        viewModel.configure(partyId: "party-1")
    }

    override func tearDown() {
        URLProtocol.unregisterClass(MockURLProtocol.self)
        MockURLProtocol.reset()
        UserDefaults.standard.removeObject(forKey: "spotify.installation.id")
        super.tearDown()
    }

    private func stubStatus(json: String, statusCode: Int = 200) {
        let url = BackendConfiguration.endpoint("/api/party/party-1/spotify/status").absoluteString + "?source=ios"
        MockURLProtocol.stubs[url] = .success(
            .init(statusCode: statusCode, body: Data(json.utf8),
                  headers: ["Content-Type": "application/json"])
        )
    }

    private func stubCallback(code: String? = "auth_code", state: String? = "s1", statusCode: Int = 200) {
        var comps = URLComponents(url: BackendConfiguration.endpoint("/api/spotify/ios/callback"),
                                   resolvingAgainstBaseURL: false)!
        comps.queryItems = [
            URLQueryItem(name: "code", value: code),
            URLQueryItem(name: "state", value: state)
        ]
        MockURLProtocol.stubs[comps.url!.absoluteString] = .success(
            .init(statusCode: statusCode, body: Data())
        )
    }

    // MARK: - loginURL

    func testLoginURLContainsPartyIdAndSourceIos() {
        let url = viewModel.loginURL
        XCTAssertTrue(url.absoluteString.contains("/party-1/spotify/login"))
        XCTAssertTrue(url.absoluteString.contains("source=ios"))
        XCTAssertTrue(url.absoluteString.contains("installationId="))
    }

    func testInstallationIdIsPersistentAcrossInstances() {
        let comps1 = URLComponents(url: viewModel.loginURL, resolvingAgainstBaseURL: false)!
        let vm2 = SpotifyAuthViewModel()
        vm2.configure(partyId: "party-1")
        let comps2 = URLComponents(url: vm2.loginURL, resolvingAgainstBaseURL: false)!

        let iid1 = comps1.queryItems?.first(where: { $0.name == "installationId" })?.value
        let iid2 = comps2.queryItems?.first(where: { $0.name == "installationId" })?.value

        XCTAssertNotNil(iid1)
        XCTAssertEqual(iid1, iid2)
    }

    // MARK: - checkLoginStatus

    func testCheckLoginStatusSetsIsLoggedIn() async {
        stubStatus(json: #"{"loggedIn":true}"#)
        await viewModel.checkLoginStatus()

        XCTAssertTrue(viewModel.isLoggedIn)
        XCTAssertFalse(viewModel.isChecking)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testCheckLoginStatusSetsIsNotLoggedIn() async {
        stubStatus(json: #"{"loggedIn":false}"#)
        await viewModel.checkLoginStatus()

        XCTAssertFalse(viewModel.isLoggedIn)
        XCTAssertFalse(viewModel.isChecking)
    }

    func testCheckLoginStatusSetsErrorOnNetworkFailure() async {
        let url = BackendConfiguration.endpoint("/api/party/party-1/spotify/status").absoluteString + "?source=ios"
        MockURLProtocol.stubs[url] = .failure(URLError(.notConnectedToInternet))
        await viewModel.checkLoginStatus()

        XCTAssertFalse(viewModel.isLoggedIn)
        XCTAssertFalse(viewModel.isChecking)
        XCTAssertNotNil(viewModel.errorMessage)
    }

    func testCheckLoginStatusSetsErrorOnNon2xxResponse() async {
        stubStatus(json: "", statusCode: 503)
        await viewModel.checkLoginStatus()

        XCTAssertFalse(viewModel.isLoggedIn)
        XCTAssertNotNil(viewModel.errorMessage)
    }

    // MARK: - handleCallback

    func testHandleCallbackIgnoresWrongScheme() {
        viewModel.handleCallback(URL(string: "https://example.com/callback")!)
        XCTAssertTrue(MockURLProtocol.requestedURLs.isEmpty)
    }

    func testHandleCallbackIgnoresWrongHost() {
        viewModel.handleCallback(URL(string: "musicvotingapp://something")!)
        XCTAssertTrue(MockURLProtocol.requestedURLs.isEmpty)
    }

    func testHandleCallbackWithCodeTriggersIosLogin() async throws {
        stubCallback(code: "auth_code", state: "s1")
        stubStatus(json: #"{"loggedIn":true}"#)

        viewModel.handleCallback(URL(string: "musicvotingapp://callback?code=auth_code&state=s1")!)

        // Give the internally-spawned Task time to complete.
        try await Task.sleep(for: .milliseconds(300))

        XCTAssertTrue(viewModel.isLoggedIn)
    }

    func testHandleCallbackWithoutCodeFallsBackToStatusCheck() async throws {
        stubStatus(json: #"{"loggedIn":false}"#)

        viewModel.handleCallback(URL(string: "musicvotingapp://callback")!)

        try await Task.sleep(for: .milliseconds(300))

        XCTAssertFalse(viewModel.isLoggedIn)
        XCTAssertFalse(viewModel.isChecking)
    }
}
