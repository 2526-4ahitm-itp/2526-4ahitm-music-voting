//
//  ContentView.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

private struct SpotifyStatusResponse: Decodable {
    let loggedIn: Bool
}

private struct SpotifyLoginEvent: Decodable {
    let type: String
    let payload: [String: String]?
}

@MainActor
final class SpotifyAuthViewModel: ObservableObject {
    @Published var isChecking = true
    @Published var isLoggedIn = false
    @Published var errorMessage: String?

    private let installIdKey = "spotify.installation.id"
    private lazy var installationId: String = {
        if let existing = UserDefaults.standard.string(forKey: installIdKey), !existing.isEmpty {
            return existing
        }

        let created = UUID().uuidString
        UserDefaults.standard.set(created, forKey: installIdKey)
        return created
    }()

    private var loginEventTask: Task<Void, Never>?
    private var reconnectTask: Task<Void, Never>?

    var loginURL: URL {
        var components = URLComponents(string: "http://localhost:8080/api/spotify/login")!
        components.queryItems = [
            URLQueryItem(name: "source", value: "ios"),
            URLQueryItem(name: "installationId", value: installationId)
        ]
        return components.url!
    }

    private var statusURL: URL {
        var components = URLComponents(string: "http://localhost:8080/api/spotify/status")!
        components.queryItems = [URLQueryItem(name: "source", value: "ios")]
        return components.url!
    }

    private var eventsURL: URL {
        var components = URLComponents(string: "http://localhost:8080/api/spotify/events")!
        components.queryItems = [
            URLQueryItem(name: "source", value: "ios"),
            URLQueryItem(name: "installationId", value: installationId)
        ]
        return components.url!
    }

    func checkLoginStatus() async {
        isChecking = true
        errorMessage = nil

        do {
            var request = URLRequest(url: statusURL)
            request.setValue(installationId, forHTTPHeaderField: "X-Install-Id")
            let (data, _) = try await URLSession.shared.data(for: request)
            let status = try JSONDecoder().decode(SpotifyStatusResponse.self, from: data)
            isLoggedIn = status.loggedIn
        } catch {
            isLoggedIn = false
            errorMessage = "Backend nicht erreichbar. Bitte Backend starten und erneut versuchen."
        }

        isChecking = false

        if isLoggedIn {
            stopLoginEventStream()
        }
    }

    func handleCallback(_ url: URL) {
        guard url.scheme == "musicvotingapp", url.host == "callback" else { return }
        Task { await checkLoginStatus() }
    }

    func startLoginEventStream() {
        stopLoginEventStream()

        let request = URLRequest(url: eventsURL)
        loginEventTask = Task {
            do {
                let (bytes, _) = try await URLSession.shared.bytes(for: request)
                for try await line in bytes.lines {
                    if Task.isCancelled { break }
                    guard line.hasPrefix("data:") else { continue }
                    let jsonText = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
                    if jsonText.isEmpty { continue }
                    guard let data = jsonText.data(using: .utf8) else { continue }
                    if let event = try? JSONDecoder().decode(SpotifyLoginEvent.self, from: data),
                       event.type == "login-success" {
                        await checkLoginStatus()
                        return
                    }
                }
            } catch {
                if !Task.isCancelled {
                    scheduleReconnect()
                }
            }
        }
    }

    func stopLoginEventStream() {
        loginEventTask?.cancel()
        loginEventTask = nil
        reconnectTask?.cancel()
        reconnectTask = nil
    }

    private func scheduleReconnect() {
        if isLoggedIn { return }
        if reconnectTask != nil { return }
        reconnectTask = Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            reconnectTask = nil
            if !isLoggedIn {
                startLoginEventStream()
            }
        }
    }
}

struct ContentView: View {
    @EnvironmentObject private var auth: SpotifyAuthViewModel
    @Environment(\.openURL) private var openURL

    var body: some View {
        Group {
            if auth.isChecking {
                ProgressView("Spotify Login wird gepruft...")
            } else if auth.isLoggedIn {
                MainTabsView()
            } else {
                NavigationStack {
                    VStack(spacing: 16) {
                        Text("Music Voting")
                            .font(.largeTitle)
                            .bold()

                        Text("Bitte melde dich zuerst mit Spotify an.")
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        Button("Mit Spotify anmelden") {
                            openURL(auth.loginURL)
                        }
                        .buttonStyle(.borderedProminent)

                        Button("Erneut pruefen") {
                            Task { await auth.checkLoginStatus() }
                        }
                        .buttonStyle(.bordered)

                        if let error = auth.errorMessage {
                            Text(error)
                                .font(.footnote)
                                .foregroundColor(.red)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                    }
                    .padding()
                }
            }
    }
        .task {
            if auth.isChecking {
                await auth.checkLoginStatus()
            }
            if !auth.isLoggedIn {
                auth.startLoginEventStream()
            }
        }
    }
}

private struct MainTabsView: View {
    var body: some View {
        TabView {
            AdminDashboard()
                .tabItem {
                    Label("Admin", systemImage: "person.crop.circle")
                }
            QRCodeView()
                .tabItem {
                    Label("QR-Code", systemImage: "qrcode")
                }
            VotingView()
                .tabItem {
                    Label("Voting", systemImage: "heart")
                }
            SongAddView()
                .tabItem {
                    Label("Add Song", systemImage: "plus")
                }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(SpotifyAuthViewModel())
}
