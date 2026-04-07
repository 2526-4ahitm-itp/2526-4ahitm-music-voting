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
            errorMessage = "Spotify-Anmeldung ist derzeit nicht erreichbar. Bitte versuche es erneut."
        }

        isChecking = false
    }

    func handleCallback(_ url: URL) {
        guard url.scheme == "musicvotingapp", url.host == "callback" else { return }
        Task { await checkLoginStatus() }
    }
}

struct SpotifyAuthView: View {
    @EnvironmentObject private var auth: SpotifyAuthViewModel
    @EnvironmentObject private var appState: AppState
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
                                        .font(.footnote)
                                        .foregroundStyle(.white)
                                        .multilineTextAlignment(.center)
                                        .padding(16)
                                        .frame(maxWidth: .infinity)
                                        .background(.red.opacity(0.25), in: RoundedRectangle(cornerRadius: 20))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 20)
                                                .stroke(.white.opacity(0.2), lineWidth: 1)
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
        }
        .task {
            if auth.isChecking {
                await auth.checkLoginStatus()
            }
            if auth.isLoggedIn {
                appState.currentSite = .admin
            }
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
}
