import Foundation

enum BackendConfiguration {
    static let userDefaultsKey = "backend.baseURL"
    static let infoPlistKey = "BackendBaseURL"
    private static let defaultPort = 8080

    static var baseURLString: String {
        // Preferred: set once in `Info.plist` so you don't have to type it on the device.
        if let configured = Bundle.main.object(forInfoDictionaryKey: infoPlistKey) as? String,
           let normalized = normalizedBaseURLString(configured) {
            return normalized
        }

        if let stored = UserDefaults.standard.string(forKey: userDefaultsKey),
           let normalized = normalizedBaseURLString(stored) {
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

        let withScheme = trimmed.contains("://") ? trimmed : "http://\(trimmed)"
        guard var components = URLComponents(string: withScheme) else { return nil }

        guard components.scheme == "http" || components.scheme == "https" else { return nil }
        guard components.host != nil else { return nil }

        if components.port == nil {
            components.port = defaultPort
        }

        components.user = nil
        components.password = nil
        components.path = ""
        components.query = nil
        components.fragment = nil

        guard let url = components.url else { return nil }
        return url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }
}
