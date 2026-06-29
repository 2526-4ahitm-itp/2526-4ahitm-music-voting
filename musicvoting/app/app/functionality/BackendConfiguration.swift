import Foundation

enum BackendConfiguration {
    static let userDefaultsKey = "backend.baseURL"
    static let infoPlistKey = "BackendBaseURL"
    private static let defaultPort = 8080

    static var baseURLString: String {
        if let stored = UserDefaults.standard.string(forKey: userDefaultsKey),
           let normalized = normalizedBaseURLString(stored) {
            return normalized
        }

        if let configured = Bundle.main.object(forInfoDictionaryKey: infoPlistKey) as? String,
           let normalized = normalizedBaseURLString(configured) {
            return normalized
        }

        return "http://localhost:\(defaultPort)"
    }

    static var baseURL: URL {
        URL(string: baseURLString)!
    }

    static func endpoint(_ path: String) -> URL {
        let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
        return baseURL.appendingPathComponent(trimmed)
    }

    @discardableResult
    static func setBaseURLString(_ rawValue: String) -> Bool {
        guard let normalized = normalizedBaseURLString(rawValue) else {
            return false
        }
        UserDefaults.standard.set(normalized, forKey: userDefaultsKey)
        return true
    }

    static func resetToDefault() {
        UserDefaults.standard.removeObject(forKey: userDefaultsKey)
    }

    static func normalizedBaseURLString(_ rawValue: String) -> String? {
        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        let isLocal = trimmed.hasPrefix("localhost") || trimmed.hasPrefix("127.") ||
                      isIPv4Address(trimmed.components(separatedBy: ":").first ?? "")

        let withScheme = trimmed.contains("://") ? trimmed
                         : isLocal ? "http://\(trimmed)"
                         : "https://\(trimmed)"
        guard var components = URLComponents(string: withScheme) else { return nil }

        guard components.scheme == "http" || components.scheme == "https" else { return nil }
        guard let host = components.host else { return nil }

        let isLocalHost = host == "localhost" || isIPv4Address(host)
        if isLocalHost {
            if components.port == nil { components.port = defaultPort }
        } else {
            // Cloud/ingress hosts: strip any explicit port and enforce https
            components.port = nil
            if components.scheme == "http" { components.scheme = "https" }
        }

        components.user = nil
        components.password = nil
        components.path = ""
        components.query = nil
        components.fragment = nil

        guard let url = components.url else { return nil }
        return url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private static func isIPv4Address(_ host: String) -> Bool {
        let parts = host.split(separator: ".")
        guard parts.count == 4 else { return false }
        return parts.allSatisfy { part in
            guard let value = Int(part), value >= 0 && value <= 255 else { return false }
            return true
        }
    }
}
