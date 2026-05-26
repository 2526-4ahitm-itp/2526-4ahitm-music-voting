//
//  SpotifyAuthView.swift
//  app
//
//  Created by Simone Sperrer on 18.03.26.
//

import SwiftUI

private struct SpotifyStatusResponse: Decodable {
    let loggedIn: Bool
}

private struct LoginEvent: Decodable {
    let type: String
    let payload: Payload?

    struct Payload: Decodable {
        let source: String?
        let installationId: String?
    }
}

@MainActor
final class SpotifyAuthViewModel: ObservableObject {

    @Published var isChecking = true
    @Published var isLoggedIn = false
    @Published var errorMessage: String?

    private(set) var partyId: String?

    private let installIdKey = "spotify.installation.id"
    private lazy var installationId: String = {
        if let existing = UserDefaults.standard.string(forKey: installIdKey), !existing.isEmpty {
            return existing
        }

        let created = UUID().uuidString
        UserDefaults.standard.set(created, forKey: installIdKey)
        return created
    }()

    func configure(partyId: String) {
        self.partyId = partyId
    }

    var loginURL: URL {
        let base = partyId.map { "/api/party/\($0)/spotify/login" } ?? "/api/party/unknown/spotify/login"
        var components = URLComponents(url: BackendConfiguration.endpoint(base), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "source", value: "ios"),
            URLQueryItem(name: "installationId", value: installationId)
        ]
        return components.url!
    }

    private var statusURL: URL {
        let base = partyId.map { "/api/party/\($0)/spotify/status" } ?? "/api/party/unknown/spotify/status"
        var components = URLComponents(url: BackendConfiguration.endpoint(base), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "source", value: "ios")]
        return components.url!
    }

    private var eventsURL: URL {
        var components = URLComponents(url: BackendConfiguration.endpoint("/api/spotify/events"), resolvingAgainstBaseURL: false)!
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
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                throw URLError(.badServerResponse)
            }
            let status = try JSONDecoder().decode(SpotifyStatusResponse.self, from: data)
            isLoggedIn = status.loggedIn
        } catch {
            isLoggedIn = false
            errorMessage = "Spotify-Anmeldung ist derzeit nicht erreichbar. Bitte versuche es erneut."
        }

        isChecking = false
    }

    func handleCallback(_ url: URL) {
        guard url.scheme == "musicvotingapp", url.host == "callback" else { return }
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            Task { await checkLoginStatus() }
            return
        }

        let queryItems = components.queryItems ?? []
        let code = queryItems.first(where: { $0.name == "code" })?.value
        let state = queryItems.first(where: { $0.name == "state" })?.value

        if let code, !code.isEmpty {
            Task { await completeIosLogin(code: code, state: state) }
            return
        }

        Task { await checkLoginStatus() }
    }

    func listenForLoginSuccess() async {
        do {
            let (bytes, _) = try await URLSession.shared.bytes(from: eventsURL)
            for try await line in bytes.lines {
                guard line.hasPrefix("data:") else { continue }
                let json = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
                guard let data = json.data(using: .utf8),
                      let event = try? JSONDecoder().decode(LoginEvent.self, from: data),
                      event.type == "login-success",
                      event.payload?.source == "ios",
                      event.payload?.installationId == installationId
                else { continue }
                isLoggedIn = true
                return
            }
        } catch {
            // stream ended or task cancelled — no action needed
        }
    }

    private func completeIosLogin(code: String, state: String?) async {
        isChecking = true
        errorMessage = nil

        var components = URLComponents(url: BackendConfiguration.endpoint("/api/spotify/ios/callback"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "code", value: code),
            URLQueryItem(name: "state", value: state)
        ]

        guard let url = components?.url else {
            isChecking = false
            errorMessage = "Spotify-Anmeldung ist fehlgeschlagen. Bitte versuche es erneut."
            return
        }

        do {
            var request = URLRequest(url: url)
            request.setValue(installationId, forHTTPHeaderField: "X-Install-Id")
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                throw URLError(.badServerResponse)
            }
            await checkLoginStatus()
        } catch {
            isChecking = false
            isLoggedIn = false
            errorMessage = "Spotify-Anmeldung ist fehlgeschlagen. Bitte versuche es erneut."
        }
    }
}

struct SpotifyAuthView: View {
    @EnvironmentObject private var auth: SpotifyAuthViewModel
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var partySession: PartySessionStore
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color("primary"), Color("secondary"), Color("accent")],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        Image("note")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 170)
                            .padding(.top, 100)

                        VStack(spacing: 12) {
                            Text("Spotify Login")
                                .font(.largeTitle)
                                .bold()
                                .foregroundStyle(.white)

                            if auth.isChecking {
                                ProgressView("Spotify Login wird gepruft...")
                                    .tint(.white)
                                    .foregroundStyle(.white)
                            } else {
                                Text("Bitte melde dich zuerst mit Spotify an, für das Hosten der Party.")
                                    .foregroundStyle(.white)
                                    .multilineTextAlignment(.center)
                                    .font(.title3)
                            }
                        }
                        .padding(.horizontal, 24)

                        if !auth.isChecking {
                            VStack(spacing: 15) {
                                Button {
                                    openURL(auth.loginURL)
                                } label: {
                                    Label("Bei Spotify anmelden", systemImage: "music.note")
                                        .font(.headline)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(20)
                                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 30))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 30)
                                                .stroke(.white.opacity(0.3), lineWidth: 1)
                                        )
                                }
                                .foregroundStyle(.white)

                                if let error = auth.errorMessage {
                                    Text(error)
                                        .font(.callout)
                                        .foregroundStyle(.white)
                                        .multilineTextAlignment(.center).bold()
                                        .padding(16)
                                        .frame(maxWidth: .infinity)
                                        .background(Color("primary").opacity(0.30), in: RoundedRectangle(cornerRadius: 30))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 30)
                                                .stroke(.white.opacity(0.2), lineWidth: 2)
                                        )
                                }
                            }
                            .padding(.horizontal, 40)
                            .padding(.top, 20)
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("Music Voting")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        appState.currentSite = .start
                    } label: {
                        Label("Zurück", systemImage: "chevron.left")
                            .font(.headline)
                            .bold()
                            .frame(maxWidth: 120)
                            .padding(12)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color("primary"),
                                        Color("accent")
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                ),
                                in: RoundedRectangle(cornerRadius: 30)
                            )
                    }
                    .foregroundStyle(.white)
                }
            }
        }
        .task {
            if let id = partySession.partyId {
                auth.configure(partyId: id)
            }
            if auth.isChecking {
                await auth.checkLoginStatus()
            }
            if auth.isLoggedIn {
                appState.currentSite = .admin
            }
        }
        .task {
            await auth.listenForLoginSuccess()
        }
        .onChange(of: auth.isLoggedIn) { isLoggedIn in
            if isLoggedIn {
                appState.currentSite = .admin
            }
        }
    }
}

#Preview {
    SpotifyAuthView()
        .environmentObject(SpotifyAuthViewModel())
        .environmentObject(AppState())
        .environmentObject(PartySessionStore())
}
