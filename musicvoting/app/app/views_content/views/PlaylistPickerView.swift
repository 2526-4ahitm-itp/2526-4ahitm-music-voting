import SwiftUI

fileprivate struct SpotifyPlaylist: Identifiable, Decodable {
    let id: String
    let name: String
    let trackCount: Int
    let imageUrl: String?
}

private struct PlaylistsResponse: Decodable {
    let playlists: [SpotifyPlaylist]
}

@MainActor
final class PlaylistPickerViewModel: ObservableObject {
    @Published fileprivate var playlists: [SpotifyPlaylist] = []
    @Published var isLoading = false
    @Published var isSaving = false
    @Published var errorMessage: String?

    func loadPlaylists(partySession: PartySessionStore) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            guard let url = partySession.partyURL(path: "spotify/playlists") else {
                throw URLError(.badURL)
            }
            var request = URLRequest(url: url)
            if let hostPin = partySession.hostPin {
                request.setValue("Bearer \(hostPin)", forHTTPHeaderField: "Authorization")
            }
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                throw URLError(.badServerResponse)
            }
            playlists = try JSONDecoder().decode(PlaylistsResponse.self, from: data).playlists
        } catch {
            errorMessage = String(localized: "playlistpicker.error.load")
        }
    }

    fileprivate func selectPlaylist(_ playlist: SpotifyPlaylist, partySession: PartySessionStore, appState: AppState) async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            guard let url = partySession.partyURL(path: "default-playlist") else {
                throw URLError(.badURL)
            }
            var request = URLRequest(url: url)
            request.httpMethod = "PUT"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if let hostPin = partySession.hostPin {
                request.setValue("Bearer \(hostPin)", forHTTPHeaderField: "Authorization")
            }
            request.httpBody = try JSONSerialization.data(withJSONObject: ["playlistId": playlist.id])
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                throw URLError(.badServerResponse)
            }
            appState.currentSite = .admin
        } catch {
            errorMessage = String(localized: "playlistpicker.error.save")
        }
    }

    func skip(appState: AppState) {
        appState.currentSite = .admin
    }
}

struct PlaylistPickerView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var partySession: PartySessionStore
    @StateObject private var viewModel = PlaylistPickerViewModel()

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
                            .frame(width: 140)
                            .padding(.top, 80)

                        VStack(spacing: 8) {
                            Text("playlistpicker.title")
                                .font(.largeTitle)
                                .bold()
                                .foregroundStyle(.white)
                            Text("playlistpicker.subtitle")
                                .font(.body)
                                .foregroundStyle(.white.opacity(0.85))
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 32)
                        }

                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                                .scaleEffect(1.4)
                                .padding(.top, 32)
                        } else {
                            VStack(spacing: 12) {
                                ForEach(viewModel.playlists) { playlist in
                                    PlaylistRow(playlist: playlist, isSaving: viewModel.isSaving) {
                                        Task { await viewModel.selectPlaylist(playlist, partySession: partySession, appState: appState) }
                                    }
                                }
                            }
                            .padding(.horizontal, 24)
                        }

                        if let error = viewModel.errorMessage {
                            VStack(spacing: 12) {
                                Text(error)
                                    .font(.callout)
                                    .foregroundStyle(.white)
                                    .multilineTextAlignment(.center)
                                    .bold()
                                    .padding(16)
                                    .frame(maxWidth: .infinity)
                                    .background(Color("primary").opacity(0.30), in: RoundedRectangle(cornerRadius: 30))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 30)
                                            .stroke(.white.opacity(0.2), lineWidth: 2)
                                    )

                                if viewModel.playlists.isEmpty {
                                    Button {
                                        Task { await viewModel.loadPlaylists(partySession: partySession) }
                                    } label: {
                                        Text("playlistpicker.retry")
                                            .font(.headline)
                                            .foregroundStyle(.white)
                                            .padding(16)
                                            .frame(maxWidth: .infinity)
                                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 30))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 30)
                                                    .stroke(.white.opacity(0.3), lineWidth: 1)
                                            )
                                    }
                                }
                            }
                            .padding(.horizontal, 24)
                        }

                        Button {
                            viewModel.skip(appState: appState)
                        } label: {
                            Text("playlistpicker.skip")
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.85))
                                .underline()
                                .padding(.vertical, 8)
                        }
                        .padding(.top, 8)
                    }
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("app.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        appState.currentSite = .hostMenu
                    } label: {
                        Label("nav.back", systemImage: "chevron.left")
                            .font(.headline)
                            .bold()
                            .frame(maxWidth: 120)
                            .padding(12)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color("primary"), Color("accent")]),
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
            await viewModel.loadPlaylists(partySession: partySession)
        }
    }
}

private struct PlaylistRow: View {
    let playlist: SpotifyPlaylist
    let isSaving: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 14) {
                AsyncImage(url: playlist.imageUrl.flatMap(URL.init)) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                            .frame(width: 52, height: 52)
                            .clipped()
                    } else {
                        Color(.systemGray5)
                            .frame(width: 52, height: 52)
                            .overlay(
                                Image(systemName: "music.note.list")
                                    .font(.system(size: 18))
                                    .foregroundColor(Color(.systemGray2))
                            )
                    }
                }
                .frame(width: 52, height: 52)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 3) {
                    Text(playlist.name)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(String(format: String(localized: "playlistpicker.trackCount"), playlist.trackCount))
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                }

                Spacer()

                if isSaving {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.6))
                }
            }
            .padding(16)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(.white.opacity(0.2), lineWidth: 1)
            )
        }
        .disabled(isSaving)
    }
}

#Preview {
    PlaylistPickerView()
        .environmentObject(AppState())
        .environmentObject(PartySessionStore())
}
