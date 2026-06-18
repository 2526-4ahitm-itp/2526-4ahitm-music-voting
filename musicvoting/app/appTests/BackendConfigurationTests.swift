import Testing
import Foundation
@testable import app

@Suite(.serialized)
struct BackendConfigurationTests {

    init() {
        BackendConfiguration.resetToDefault()
    }

    @Test func defaultBaseURLIsLocalhostWithDefaultPort() {
        BackendConfiguration.resetToDefault()

        #expect(BackendConfiguration.baseURLString == "http://localhost:8080")
    }

    @Test func normalizedBaseURLStringTrimsWhitespace() {
        #expect(BackendConfiguration.normalizedBaseURLString("  192.168.1.5  ") == "http://192.168.1.5:8080")
    }

    @Test func normalizedBaseURLStringRejectsEmptyString() {
        #expect(BackendConfiguration.normalizedBaseURLString("   ") == nil)
    }

    @Test func normalizedBaseURLStringAddsDefaultSchemeAndPortForLocalhost() {
        #expect(BackendConfiguration.normalizedBaseURLString("localhost") == "http://localhost:8080")
    }

    @Test func normalizedBaseURLStringAddsDefaultPortForIPv4Address() {
        #expect(BackendConfiguration.normalizedBaseURLString("10.0.0.5") == "http://10.0.0.5:8080")
    }

    @Test func normalizedBaseURLStringKeepsExplicitPort() {
        #expect(BackendConfiguration.normalizedBaseURLString("192.168.1.5:9090") == "http://192.168.1.5:9090")
    }

    @Test func normalizedBaseURLStringKeepsHttpsSchemeAndStandardPort() {
        #expect(BackendConfiguration.normalizedBaseURLString("https://music.example.com") == "https://music.example.com")
    }

    @Test func normalizedBaseURLStringRejectsUnsupportedScheme() {
        #expect(BackendConfiguration.normalizedBaseURLString("ftp://example.com") == nil)
    }

    @Test func normalizedBaseURLStringRejectsHostnameWithoutTLDAsNonLocal() {
        // A bare hostname without a known TLD is not localhost and not an IPv4
        // address, so no default port is appended.
        #expect(BackendConfiguration.normalizedBaseURLString("myserver") == "http://myserver")
    }

    @Test func normalizedBaseURLStringStripsCredentialsPathAndQuery() {
        #expect(BackendConfiguration.normalizedBaseURLString("http://user:pass@192.168.1.5:8080/api?x=1#frag") == "http://192.168.1.5:8080")
    }

    @Test func normalizedBaseURLStringRejectsInvalidIPv4Octets() {
        // "999" is not a valid octet, so this is treated as a regular hostname
        // (no automatic port appended) rather than an IPv4 address.
        #expect(BackendConfiguration.normalizedBaseURLString("999.0.0.1") == "http://999.0.0.1")
    }

    @Test func endpointAppendsPathToBaseURL() {
        BackendConfiguration.resetToDefault()

        #expect(BackendConfiguration.endpoint("/api/party").absoluteString == "http://localhost:8080/api/party")
        #expect(BackendConfiguration.endpoint("api/party").absoluteString == "http://localhost:8080/api/party")
    }

    @Test func setBaseURLStringPersistsAndIsUsedByBaseURLString() {
        let didSet = BackendConfiguration.setBaseURLString("192.168.1.42:9000")

        #expect(didSet)
        #expect(BackendConfiguration.baseURLString == "http://192.168.1.42:9000")

        BackendConfiguration.resetToDefault()
        #expect(BackendConfiguration.baseURLString == "http://localhost:8080")
    }

    @Test func setBaseURLStringRejectsInvalidValueAndLeavesPreviousConfigurationIntact() {
        BackendConfiguration.setBaseURLString("192.168.1.42:9000")

        let didSet = BackendConfiguration.setBaseURLString("not a url")

        #expect(!didSet)
        #expect(BackendConfiguration.baseURLString == "http://192.168.1.42:9000")

        BackendConfiguration.resetToDefault()
    }
}
