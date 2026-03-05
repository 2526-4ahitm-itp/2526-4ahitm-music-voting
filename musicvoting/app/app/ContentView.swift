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

@MainActor
final class SpotifyAuthViewModel: ObservableObject {
    @Published var isChecking = true
    @Published var isLoggedIn = false
    @Published var errorMessage: String?

    let loginURL = URL(string: "http://localhost:8080/api/spotify/login?source=ios")!
    private let statusURL = URL(string: "http://localhost:8080/api/spotify/status")!

    func checkLoginStatus() async {
        isChecking = true
        errorMessage = nil

        do {
            let (data, _) = try await URLSession.shared.data(from: statusURL)
            let status = try JSONDecoder().decode(SpotifyStatusResponse.self, from: data)
            isLoggedIn = status.loggedIn
        } catch {
            isLoggedIn = false
            errorMessage = "Backend nicht erreichbar. Bitte Backend starten und erneut versuchen."
        }

        isChecking = false
    }

    func handleCallback(_ url: URL) {
        guard url.scheme == "musicvotingapp", url.host == "callback" else { return }
        Task { await checkLoginStatus() }
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
