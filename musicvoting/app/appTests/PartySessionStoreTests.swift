import XCTest
import Foundation
@testable import app

@MainActor
final class PartySessionStoreTests: XCTestCase {

    private let sessionKeys = ["mv.party.id", "mv.party.pin", "mv.party.hostPin", "mv.party.role"]

    override func setUp() {
        super.setUp()
        URLProtocol.registerClass(MockURLProtocol.self)
        MockURLProtocol.reset()
        BackendConfiguration.resetToDefault()
        sessionKeys.forEach { UserDefaults.standard.removeObject(forKey: $0) }
    }

    override func tearDown() {
        URLProtocol.unregisterClass(MockURLProtocol.self)
        MockURLProtocol.reset()
        sessionKeys.forEach { UserDefaults.standard.removeObject(forKey: $0) }
        super.tearDown()
    }

    private func stub(_ path: String, statusCode: Int = 200, json: String = "{}") {
        let url = BackendConfiguration.endpoint(path).absoluteString
        MockURLProtocol.stubs[url] = .success(
            .init(statusCode: statusCode, body: Data(json.utf8),
                  headers: ["Content-Type": "application/json"])
        )
    }

    private func stubError(_ path: String) {
        let url = BackendConfiguration.endpoint(path).absoluteString
        MockURLProtocol.stubs[url] = .failure(URLError(.notConnectedToInternet))
    }

    private func preloadSession(id: String, pin: String? = nil, hostPin: String? = nil) {
        UserDefaults.standard.set(id, forKey: "mv.party.id")
        UserDefaults.standard.set(PartyRole.host.rawValue, forKey: "mv.party.role")
        if let pin { UserDefaults.standard.set(pin, forKey: "mv.party.pin") }
        if let hostPin { UserDefaults.standard.set(hostPin, forKey: "mv.party.hostPin") }
    }

    // MARK: - Initial state

    func testInitialStateIsEmptyWhenNoDefaultsSet() {
        let store = PartySessionStore()
        XCTAssertNil(store.partyId)
        XCTAssertNil(store.pin)
        XCTAssertNil(store.hostPin)
        XCTAssertNil(store.role)
        XCTAssertFalse(store.hasActiveParty)
    }

    // MARK: - setSession / updatePin / clear

    func testSetSessionPersistsAllFields() {
        let store = PartySessionStore()
        store.setSession(id: "p1", pin: "11111", hostPin: "AAAAA", role: .host)

        XCTAssertEqual(store.partyId, "p1")
        XCTAssertEqual(store.pin, "11111")
        XCTAssertEqual(store.hostPin, "AAAAA")
        XCTAssertEqual(store.role, .host)
        XCTAssertTrue(store.hasActiveParty)

        let store2 = PartySessionStore()
        XCTAssertEqual(store2.partyId, "p1")
        XCTAssertEqual(store2.role, .host)
    }

    func testSetSessionWithGuestRole() {
        let store = PartySessionStore()
        store.setSession(id: "p2", pin: "22222", role: .guest)

        XCTAssertEqual(store.role, .guest)
        XCTAssertNil(store.hostPin)
    }

    func testUpdatePinChangesAndPersists() {
        let store = PartySessionStore()
        store.setSession(id: "p", pin: "00000", role: .host)
        store.updatePin("99999")

        XCTAssertEqual(store.pin, "99999")
        XCTAssertEqual(PartySessionStore().pin, "99999")
    }

    func testUpdatePinWithNilRemovesPin() {
        let store = PartySessionStore()
        store.setSession(id: "p", pin: "00000", role: .host)
        store.updatePin(nil)

        XCTAssertNil(store.pin)
        XCTAssertNil(PartySessionStore().pin)
    }

    func testClearRemovesAllFields() {
        let store = PartySessionStore()
        store.setSession(id: "p", pin: "00000", hostPin: "XXXXX", role: .host)
        store.clear()

        XCTAssertNil(store.partyId)
        XCTAssertNil(store.pin)
        XCTAssertNil(store.hostPin)
        XCTAssertNil(store.role)
        XCTAssertFalse(store.hasActiveParty)
        XCTAssertNil(PartySessionStore().partyId)
    }

    // MARK: - createParty

    func testCreatePartySuccessSetsSession() async throws {
        stub("/api/party", json: """
            {"id":"p1","pin":"11111","hostPin":"AAAAA","joinUrl":"http://example.com/join/11111"}
        """)
        let store = PartySessionStore()

        let response = try await store.createParty(provider: "spotify")

        XCTAssertEqual(response.id, "p1")
        XCTAssertEqual(store.partyId, "p1")
        XCTAssertEqual(store.role, .host)
    }

    func testCreatePartyThrowsOnNetworkError() async {
        stubError("/api/party")
        let store = PartySessionStore()

        do {
            _ = try await store.createParty()
            XCTFail("Expected throw")
        } catch {
            XCTAssertNil(store.partyId)
        }
    }

    func testCreatePartyThrowsNotFoundOn404() async {
        stub("/api/party", statusCode: 404, json: "")
        let store = PartySessionStore()

        do {
            _ = try await store.createParty()
            XCTFail("Expected throw")
        } catch is PartySessionError {
            // expected
        } catch {
            XCTFail("Expected PartySessionError but got \(error)")
        }
    }

    // MARK: - resolve

    func testResolveSuccessSetsGuestSession() async throws {
        stub("/api/party/join/12345", json: #"{"id":"p2"}"#)
        let store = PartySessionStore()

        let response = try await store.resolve(pin: "12345")

        XCTAssertEqual(response.id, "p2")
        XCTAssertEqual(store.role, .guest)
        XCTAssertEqual(store.pin, "12345")
    }

    func testResolveThrowsNotFoundOn404() async {
        stub("/api/party/join/00000", statusCode: 404, json: "")
        let store = PartySessionStore()

        do {
            _ = try await store.resolve(pin: "00000")
            XCTFail("Expected throw")
        } catch is PartySessionError {
            // expected
        } catch {
            XCTFail("Expected PartySessionError but got \(error)")
        }
    }

    // MARK: - resolveAsHost

    func testResolveAsHostSuccessSetsHostSession() async throws {
        stub("/api/party/host-join/HPIN1", json: #"{"id":"p3","guestPin":"54321"}"#)
        let store = PartySessionStore()

        let response = try await store.resolveAsHost(hostPin: "HPIN1")

        XCTAssertEqual(response.id, "p3")
        XCTAssertEqual(store.hostPin, "HPIN1")
        XCTAssertEqual(store.pin, "54321")
    }

    func testResolveAsHostThrowsNotFoundOn404() async {
        stub("/api/party/host-join/WRONG", statusCode: 404, json: "")
        let store = PartySessionStore()

        do {
            _ = try await store.resolveAsHost(hostPin: "WRONG")
            XCTFail("Expected throw")
        } catch is PartySessionError {
            // expected
        } catch {
            XCTFail("Expected PartySessionError but got \(error)")
        }
    }

    // MARK: - loadPartyDetails

    func testLoadPartyDetailsThrowsWithoutActiveParty() async {
        let store = PartySessionStore()
        do {
            _ = try await store.loadPartyDetails()
            XCTFail("Expected throw")
        } catch {}
    }

    func testLoadPartyDetailsUpdatesPin() async throws {
        preloadSession(id: "p4", pin: "00000")
        stub("/api/party/p4", json: #"{"id":"p4","pin":"99999"}"#)
        let store = PartySessionStore()

        let details = try await store.loadPartyDetails()

        XCTAssertEqual(details.pin, "99999")
        XCTAssertEqual(store.pin, "99999")
    }

    // MARK: - endParty

    func testEndPartySuccessClearsSession() async throws {
        preloadSession(id: "p5", pin: "11111", hostPin: "HHHHH")
        stub("/api/party/p5")
        let store = PartySessionStore()

        try await store.endParty()

        XCTAssertNil(store.partyId)
    }

    func testEndPartyThrowsWithoutActiveParty() async {
        let store = PartySessionStore()
        do {
            try await store.endParty()
            XCTFail("Expected throw")
        } catch {}
    }

    func testEndPartyThrowsBadRequestOn400() async {
        preloadSession(id: "p6", pin: "11111", hostPin: "HHHHH")
        stub("/api/party/p6", statusCode: 400, json: "Ungültige Anfrage.")
        let store = PartySessionStore()

        do {
            try await store.endParty()
            XCTFail("Expected throw")
        } catch is PartySessionError {
            XCTAssertEqual(store.partyId, "p6")
        } catch {
            XCTFail("Expected PartySessionError but got \(error)")
        }
    }

    // MARK: - sseEventsURL

    func testSseEventsURLIsNilWithoutActiveParty() {
        let store = PartySessionStore()
        XCTAssertNil(store.sseEventsURL)
    }

    func testSseEventsURLContainsPartyIdAndSourceQueryItems() {
        preloadSession(id: "p7")
        let store = PartySessionStore()
        let url = store.sseEventsURL
        let components = url.flatMap { URLComponents(url: $0, resolvingAgainstBaseURL: false) }
        let items = components?.queryItems ?? []

        XCTAssertNotNil(url)
        XCTAssertTrue(url?.absoluteString.contains("p7") == true)
        XCTAssertEqual(items.first(where: { $0.name == "source" })?.value, "ios")
        XCTAssertEqual(items.first(where: { $0.name == "partyId" })?.value, "p7")
        XCTAssertNotNil(items.first(where: { $0.name == "installationId" }))
    }

    // MARK: - partyURL

    func testPartyURLIsNilWithoutActiveParty() {
        XCTAssertNil(PartySessionStore().partyURL(path: "track/queue"))
    }

    func testPartyURLAppendsPathWithAndWithoutLeadingSlash() {
        preloadSession(id: "p8")
        let store = PartySessionStore()

        XCTAssertTrue(store.partyURL(path: "/track/queue")?.absoluteString.hasSuffix("/p8/track/queue") == true)
        XCTAssertTrue(store.partyURL(path: "track/queue")?.absoluteString.hasSuffix("/p8/track/queue") == true)
    }
}
