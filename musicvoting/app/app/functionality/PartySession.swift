import Foundation
import Combine

enum PartyRole: String {
    case host
    case guest
}

struct CreatePartyResponse: Decodable {
    let id: String
    let pin: String
    let hostPin: String
    let joinUrl: String
}

struct PartyJoinResponse: Decodable {
    let id: String
}

struct HostJoinResponse: Decodable {
    let id: String
    let guestPin: String
}

struct PartyDetailsResponse: Decodable {
    let id: String
    let pin: String
}

@MainActor
final class PartySessionStore: ObservableObject {
    @Published private(set) var partyId: String?
    @Published private(set) var pin: String?
    @Published private(set) var hostPin: String?
    @Published private(set) var role: PartyRole?

    private let partyIdKey = "mv.party.id"
    private let pinKey = "mv.party.pin"
    private let hostPinKey = "mv.party.hostPin"
    private let roleKey = "mv.party.role"

    init() {
        partyId = UserDefaults.standard.string(forKey: partyIdKey)
        pin = UserDefaults.standard.string(forKey: pinKey)
        hostPin = UserDefaults.standard.string(forKey: hostPinKey)
        role = UserDefaults.standard.string(forKey: roleKey).flatMap(PartyRole.init(rawValue:))
    }

    var hasActiveParty: Bool {
        partyId != nil
    }

    func setSession(id: String, pin: String? = nil, hostPin: String? = nil, role: PartyRole) {
        partyId = id
        self.pin = pin
        self.hostPin = hostPin
        self.role = role
        UserDefaults.standard.set(id, forKey: partyIdKey)
        UserDefaults.standard.set(role.rawValue, forKey: roleKey)
        if let pin {
            UserDefaults.standard.set(pin, forKey: pinKey)
        } else {
            UserDefaults.standard.removeObject(forKey: pinKey)
        }
        if let hostPin {
            UserDefaults.standard.set(hostPin, forKey: hostPinKey)
        } else {
            UserDefaults.standard.removeObject(forKey: hostPinKey)
        }
    }

    func updatePin(_ pin: String?) {
        self.pin = pin
        if let pin {
            UserDefaults.standard.set(pin, forKey: pinKey)
        } else {
            UserDefaults.standard.removeObject(forKey: pinKey)
        }
    }

    func clear() {
        partyId = nil
        pin = nil
        hostPin = nil
        role = nil
        UserDefaults.standard.removeObject(forKey: partyIdKey)
        UserDefaults.standard.removeObject(forKey: pinKey)
        UserDefaults.standard.removeObject(forKey: hostPinKey)
        UserDefaults.standard.removeObject(forKey: roleKey)
    }

    func createParty(provider: String = "spotify") async throws -> CreatePartyResponse {
        var request = URLRequest(url: BackendConfiguration.endpoint("/api/party"), timeoutInterval: 10)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["provider": provider])

        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.validate(response: response, data: data)

        let result = try JSONDecoder().decode(CreatePartyResponse.self, from: data)
        setSession(id: result.id, pin: result.pin, hostPin: result.hostPin, role: .host)
        return result
    }

    func resolve(pin: String) async throws -> PartyJoinResponse {
        let url = BackendConfiguration.endpoint("/api/party/join/\(pin)")
        let req = URLRequest(url: url, timeoutInterval: 10)
        let (data, response) = try await URLSession.shared.data(for: req)
        try Self.validate(response: response, data: data)

        let result = try JSONDecoder().decode(PartyJoinResponse.self, from: data)
        setSession(id: result.id, pin: pin, role: .guest)
        return result
    }

    func resolveAsHost(hostPin: String) async throws -> HostJoinResponse {
        let url = BackendConfiguration.endpoint("/api/party/host-join/\(hostPin)")
        let req = URLRequest(url: url, timeoutInterval: 10)
        let (data, response) = try await URLSession.shared.data(for: req)
        try Self.validate(response: response, data: data)

        let result = try JSONDecoder().decode(HostJoinResponse.self, from: data)
        setSession(id: result.id, pin: result.guestPin, hostPin: hostPin, role: .host)
        return result
    }

    func loadPartyDetails() async throws -> PartyDetailsResponse {
        guard let partyId else {
            throw URLError(.badURL)
        }

        let url = BackendConfiguration.endpoint("/api/party/\(partyId)")
        let (data, response) = try await URLSession.shared.data(from: url)
        try Self.validate(response: response, data: data)

        let result = try JSONDecoder().decode(PartyDetailsResponse.self, from: data)
        updatePin(result.pin)
        return result
    }

    func endParty() async throws {
        guard let partyId else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: BackendConfiguration.endpoint("/api/party/\(partyId)"))
        request.httpMethod = "DELETE"

        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.validate(response: response, data: data)
        clear()
    }

    func partyURL(path: String) -> URL? {
        guard let partyId else { return nil }
        return BackendConfiguration.endpoint("/api/party/\(partyId)/\(normalized(path))")
    }

    private func normalized(_ path: String) -> String {
        path.hasPrefix("/") ? String(path.dropFirst()) : path
    }

    private static func validate(response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 404 {
                throw PartySessionError.notFound
            }
            if httpResponse.statusCode == 400 {
                let message = String(data: data, encoding: .utf8) ?? ""
                throw PartySessionError.badRequest(message)
            }
            throw URLError(.badServerResponse)
        }
    }
}

enum PartySessionError: LocalizedError {
    case notFound
    case badRequest(String)

    var errorDescription: String? {
        switch self {
        case .notFound:
            return "Party nicht gefunden."
        case .badRequest(let message):
            return message.isEmpty ? "Ungültige Anfrage." : message
        }
    }
}
