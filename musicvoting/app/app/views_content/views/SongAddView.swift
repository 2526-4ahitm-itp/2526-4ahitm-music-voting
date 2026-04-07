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
    let items: [TrackItem]
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

@MainActor
final class SongAddViewModel: ObservableObject {
    @Published var query = ""
    @Published var results: [SearchTrack] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var addingTrackIds: Set<String> = []
    @Published var addedTrackIds: Set<String> = []

    private var searchTask: Task<Void, Never>?

    private let searchURL = URL(string: "http://localhost:8080/api/track/search")!
    private let addToPlaylistURL = URL(string: "http://localhost:8080/api/track/addToPlaylist")!

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
            errorMessage = "Ungueltige Suchanfrage."
            return
        }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let response = try JSONDecoder().decode(SearchResponse.self, from: data)
            results = response.tracks.items.map(Self.mapTrackToSearch)
        } catch {
            results = []
            errorMessage = "Backend nicht erreichbar. Bitte Backend starten und erneut versuchen."
        }

        isLoading = false
    }

    private static func mapTrackToSearch(_ item: TrackItem) -> SearchTrack {
        let artists = item.artists.map(\.name).joined(separator: ", ")
        return SearchTrack(
            id: item.id,
            uri: item.uri,
            title: item.name,
            artist: artists.isEmpty ? "Unbekannt" : artists,
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
                errorMessage = "Fehler beim Hinzufuegen."
                return
            }

            if (200...299).contains(httpResponse.statusCode) {
                addedTrackIds.insert(track.id)
            } else {
                errorMessage = "Fehler beim Hinzufuegen."
            }
        } catch {
            errorMessage = "Backend nicht erreichbar. Bitte Backend starten und erneut versuchen."
        }
    }
}

struct SongAddView: View {
    @StateObject private var viewModel = SongAddViewModel()

    var body: some View {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    searchField

                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.footnote)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.leading)
                    }

                    resultsCard
                }
                .padding()
            
        }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)

            TextField("Suchen...", text: $viewModel.query)
                .textInputAutocapitalization(.never)
                .disableAutocorrection(true)
                .onChange(of: viewModel.query) { newValue in
                    viewModel.queueSearch(for: newValue)
                }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.black, lineWidth: 2)
        )
    }

    private var resultsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            if viewModel.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, 12)
            } else if viewModel.results.isEmpty {
                Text(viewModel.query.trimmingCharacters(in: .whitespacesAndNewlines).count < 2
                     ? ""
                     : "Keine Ergebnisse gefunden.")
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 12)
            } else {
                ForEach(viewModel.results) { track in
                    SearchResultRow(
                        track: track,
                        isAdding: viewModel.addingTrackIds.contains(track.id),
                        isAdded: viewModel.addedTrackIds.contains(track.id)
                    ) {
                        Task { await viewModel.addToPlaylist(track) }
                    }
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 35)
                .stroke(Color.black, lineWidth: 3)
        )
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
                switch phase {
                case .empty:
                    ProgressView()
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    ZStack {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))

                        Image(systemName: "music.note")
                            .foregroundColor(.gray)
                    }
                @unknown default:
                    EmptyView()
                }
            }
            .frame(width: 60, height: 60)
            .cornerRadius(6)
            .clipped()

            VStack(alignment: .leading, spacing: 4) {
                Text(track.title)
                    .font(.headline)

                Text(track.artist)
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            Spacer()

            Button(action: onAdd) {
                ZStack {
                    Circle()
                        .stroke(Color.black, lineWidth: 2)
                        .frame(width: 28, height: 28)

                    if isAdding {
                        ProgressView()
                            .scaleEffect(0.6)
                    } else {
                        Image(systemName: isAdded ? "checkmark" : "plus")
                            .foregroundColor(.black)
                            .font(.system(size: 12, weight: .bold))
                    }
                }
            }
            .disabled(isAdding || isAdded)
        }
        .padding(.vertical, 6)
    }
}

#Preview {
    SongAddView()
}
