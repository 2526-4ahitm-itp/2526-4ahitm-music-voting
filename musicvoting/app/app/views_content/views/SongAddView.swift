//
//  SongAddView.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

private struct SearchResponse: Decodable {
    let tracks: TrackContainer
}

private struct TrackContainer: Decodable {
    // Spotify can return null entries for unavailable tracks — decode as optional and filter.
    let items: [TrackItem?]
}

private struct TrackItem: Decodable {
    let id: String
    let uri: String
    let name: String
    let artists: [ArtistItem]
    let album: AlbumItem

    struct ArtistItem: Decodable {
        let name: String
    }

    struct AlbumItem: Decodable {
        let images: [ImageItem]
    }

    struct ImageItem: Decodable {
        let url: String
    }
}

struct SearchTrack: Identifiable, Equatable {
    let id: String
    let uri: String
    let title: String
    let artist: String
    let imageUrl: String
}

private struct QueueResponse: Decodable {
    let queue: [QueueEntry]

    struct QueueEntry: Decodable {
        let uri: String?
    }
}

private struct QueueEvent: Decodable {
    let type: String
}

@MainActor
final class SongAddViewModel: ObservableObject {
    @Published var query = ""
    @Published var results: [SearchTrack] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var addingTrackIds: Set<String> = []
    @Published var addedTrackIds: Set<String> = []
    @Published var queuedTrackUris: Set<String> = []

    private var searchTask: Task<Void, Never>?
    private weak var partySession: PartySessionStore?

    func configure(partySession: PartySessionStore) {
        self.partySession = partySession
    }

    private var searchURL: URL {
        partySession?.partyURL(path: "track/search") ?? BackendConfiguration.endpoint("/api/party/unknown/track/search")
    }
    private var addToPlaylistURL: URL {
        partySession?.partyURL(path: "track/addToPlaylist") ?? BackendConfiguration.endpoint("/api/party/unknown/track/addToPlaylist")
    }
    private var queueURL: URL {
        partySession?.partyURL(path: "track/queue") ?? BackendConfiguration.endpoint("/api/party/unknown/track/queue")
    }

    func loadQueue() async {
        do {
            let (data, _) = try await URLSession.shared.data(from: queueURL)
            let response = try JSONDecoder().decode(QueueResponse.self, from: data)
            queuedTrackUris = Set(response.queue.compactMap(\.uri))
        } catch {
            // Keep the previous state if the queue can't be loaded; search still works.
        }
    }

    func listenForQueueUpdates() async {
        guard let url = partySession?.sseEventsURL else { return }
        var request = URLRequest(url: url)
        request.timeoutInterval = .infinity
        while !Task.isCancelled {
            do {
                let (bytes, _) = try await URLSession.shared.bytes(for: request)
                for try await line in bytes.lines {
                    guard line.hasPrefix("data:") else { continue }
                    let json = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
                    guard let data = json.data(using: .utf8),
                          let event = try? JSONDecoder().decode(QueueEvent.self, from: data)
                    else { continue }

                    if event.type == "queue-updated" {
                        await loadQueue()
                    }
                }
            } catch {
                try? await Task.sleep(nanoseconds: 2_000_000_000)
            }
        }
    }

    func queueSearch(for text: String) {
        searchTask?.cancel()
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.count < 2 {
            results = []
            isLoading = false
            errorMessage = nil
            return
        }

        searchTask = Task {
            try? await Task.sleep(nanoseconds: 350_000_000)
            await search(query: trimmed)
        }
    }

    func search(query: String) async {
        isLoading = true
        errorMessage = nil

        var components = URLComponents(url: searchURL, resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "q", value: query)]

        guard let url = components?.url else {
            isLoading = false
            errorMessage = String(localized: "search.error.invalid")
            return
        }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                results = []
                errorMessage = String(localized: "search.error.failed")
                isLoading = false
                return
            }
            let decoded = try JSONDecoder().decode(SearchResponse.self, from: data)
            results = decoded.tracks.items.compactMap { $0 }.map(Self.mapTrackToSearch)
        } catch {
            results = []
            if !Task.isCancelled {
                errorMessage = String(localized: "error.backendUnreachable")
            }
        }

        isLoading = false
    }

    private static func mapTrackToSearch(_ item: TrackItem) -> SearchTrack {
        let artists = item.artists.map(\.name).joined(separator: ", ")
        return SearchTrack(
            id: item.id,
            uri: item.uri,
            title: item.name,
            artist: artists.isEmpty ? String(localized: "unknown") : artists,
            imageUrl: item.album.images.first?.url
                ?? "https://i.scdn.co/image/ab67616d0000b273a6ca20eceb5f6c7199b98ccb"
        )
    }

    func addToPlaylist(_ track: SearchTrack) async {
        if addingTrackIds.contains(track.id) || addedTrackIds.contains(track.id) {
            return
        }

        addingTrackIds.insert(track.id)
        defer { addingTrackIds.remove(track.id) }

        var request = URLRequest(url: addToPlaylistURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode([track.uri])

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                errorMessage = String(localized: "search.add.error")
                return
            }

            if (200...299).contains(httpResponse.statusCode) {
                addedTrackIds.insert(track.id)
                await loadQueue()
            } else {
                errorMessage = String(localized: "search.add.error")
            }
        } catch {
            errorMessage = String(localized: "error.backendUnreachable")
        }
    }
}

struct SongAddView: View {
    @StateObject private var viewModel = SongAddViewModel()
    @EnvironmentObject private var partySession: PartySessionStore

    private var gradient: some View {
        LinearGradient(
            colors: [Color("primary"), Color("secondary"), Color("accent")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    var body: some View {
        ZStack {
            gradient
            VStack(spacing: 0) {
            // Search bar — pinned at top
            VStack(alignment: .leading, spacing: 0) {
                searchField
                    .padding(.horizontal)
                    .padding(.vertical, 12)
            }

            // Scrollable results
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.footnote)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                    }

                    resultsCard
                        .padding(.horizontal)
                }
                .padding(.vertical)
            }
        }
        } // ZStack
        .onAppear {
            viewModel.configure(partySession: partySession)
            Task { await viewModel.loadQueue() }
        }
        .task {
            await viewModel.listenForQueueUpdates()
        }
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(Color("primary"))

            TextField("search.placeholder", text: $viewModel.query)
                .textInputAutocapitalization(.never)
                .disableAutocorrection(true)
                .onChange(of: viewModel.query) { newValue in
                    viewModel.queueSearch(for: newValue)
                }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color.white, in: Capsule())
        .shadow(color: .black.opacity(0.08), radius: 6, x: 0, y: 2)
    }

    private var resultsCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            if viewModel.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                        .tint(Color("primary"))
                    Spacer()
                }
                .padding(.vertical, 20)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 12))
            } else if viewModel.results.isEmpty {
                if viewModel.query.trimmingCharacters(in: .whitespacesAndNewlines).count < 2 {
                    VStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 50))
                            .foregroundStyle(.white.opacity(0.7))
                            .padding(.bottom, 8)

                        Text("search.hint")
                            .font(.title3)
                            .bold()
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)

                        Text("search.hintDetail")
                            .font(.body)
                            .foregroundStyle(.white.opacity(0.8))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 48)
                } else {
                    Text(String(localized: "search.noResults"))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.vertical, 20)
                }
            } else {
                VStack(spacing: 0) {
                    ForEach(viewModel.results) { track in
                        SearchResultRow(
                            track: track,
                            isAdding: viewModel.addingTrackIds.contains(track.id),
                            isAdded: viewModel.addedTrackIds.contains(track.id) || viewModel.queuedTrackUris.contains(track.uri)
                        ) {
                            Task { await viewModel.addToPlaylist(track) }
                        }

                        if track.id != viewModel.results.last?.id {
                            Divider()
                                .padding(.leading, 76)
                        }
                    }
                }
                .padding(.vertical, 8)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 2)
            }
        }
    }
}

private struct SearchResultRow: View {
    let track: SearchTrack
    let isAdding: Bool
    let isAdded: Bool
    let onAdd: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: track.imageUrl)) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFill()
                        .frame(width: 52, height: 52)
                        .clipped()
                } else {
                    Color("primary").opacity(0.08)
                        .frame(width: 52, height: 52)
                        .overlay(
                            Image(systemName: "music.note")
                                .font(.system(size: 18))
                                .foregroundColor(Color("primary").opacity(0.35))
                        )
                }
            }
            .frame(width: 52, height: 52)
            .clipShape(RoundedRectangle(cornerRadius: 6))

            VStack(alignment: .leading, spacing: 3) {
                Text(track.title)
                    .font(.headline)
                    .foregroundColor(.primary)
                    .lineLimit(1)
                Text(track.artist)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Button(action: onAdd) {
                ZStack {
                    Circle()
                        .fill(Color("primary").opacity(0.12))
                        .frame(width: 36, height: 36)

                    if isAdding {
                        ProgressView()
                            .scaleEffect(0.6)
                            .tint(Color("primary"))
                    } else {
                        Image(systemName: isAdded ? "checkmark" : "plus")
                            .foregroundColor(isAdded ? Color("primary") : Color("primary"))
                            .font(.system(size: 14, weight: .bold))
                    }
                }
            }
            .disabled(isAdding || isAdded)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}

#Preview {
    SongAddView()
        .environmentObject(PartySessionStore())
}
