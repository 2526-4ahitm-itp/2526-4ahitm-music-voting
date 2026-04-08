//
//  AdminDashboard.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

private struct QueueResponse: Decodable {
    let queue: [QueueTrack]
}

private struct CurrentPlaybackResponse: Decodable {
    let isPlaying: Bool
    let track: QueueTrack?
}

private struct QueueTrack: Decodable {
    let name: String
    let artists: [Artist]
    let album: Album

    struct Artist: Decodable {
        let name: String
    }

    struct Album: Decodable {
        let images: [ImageItem]

        struct ImageItem: Decodable {
            let url: String
        }
    }
}

@MainActor
final class AdminDashboardViewModel: ObservableObject {
    @Published var currentSong: Song?
    @Published var isPlaying = false
    @Published var queueSongs: [Song] = []

    private let queueURL = URL(string: "http://localhost:8080/api/track/queue")!
    private let startURL = URL(string: "http://localhost:8080/api/track/start")!
    private let pauseURL = URL(string: "http://localhost:8080/api/track/pause")!
    private let resumeURL = URL(string: "http://localhost:8080/api/track/resume")!
    private let currentURL = URL(string: "http://localhost:8080/api/track/current")!

    func loadQueue() async {
        do {
            let (data, _) = try await URLSession.shared.data(from: queueURL)
            let response = try JSONDecoder().decode(QueueResponse.self, from: data)
            let newQueue = response.queue.map(Self.mapTrackToSong)
            
            if newQueue != queueSongs {
                queueSongs = newQueue
            }
        } catch {
            queueSongs = []
        }
    }

    func loadCurrentPlayback() async {
        do {
            let (data, _) = try await URLSession.shared.data(from: currentURL)
            let response = try JSONDecoder().decode(CurrentPlaybackResponse.self, from: data)
            isPlaying = response.isPlaying
            if let track = response.track {
                currentSong = Self.mapTrackToSong(track)
            }
        } catch {
            // Keep the last known state if backend call fails.
        }
    }

    func refreshDashboardState() async {
        await loadQueue()
        await loadCurrentPlayback()
    }

    func togglePlayPause() async {
        if isPlaying {
            await pauseCurrentSong()
        } else if currentSong != nil {
            await resumeCurrentSong()
        } else {
            await startPlaylist()
        }
    }

    private func startPlaylist() async {
        if await performPostRequest(url: startURL) {
            await loadCurrentPlayback()
            await loadQueue()
        }
    }

    private func pauseCurrentSong() async {
        if await performPostRequest(url: pauseURL) {
            isPlaying = false
            await loadCurrentPlayback()
        }
    }

    private func resumeCurrentSong() async {
        if await performPostRequest(url: resumeURL) {
            await loadCurrentPlayback()
        }
    }

    private func performPostRequest(url: URL) async -> Bool {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data("{}".utf8)

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                return false
            }
            return (200...299).contains(httpResponse.statusCode)
        } catch {
            return false
        }
    }

    private static func mapTrackToSong(_ track: QueueTrack) -> Song {
        let artistText = track.artists.map(\.name).joined(separator: ", ")
        return Song(
            title: track.name,
            artist: artistText.isEmpty ? "Unbekannt" : artistText,
            imageUrl: track.album.images.first?.url
                ?? "https://i.scdn.co/image/ab67616d0000b273a6ca20eceb5f6c7199b98ccb"
        )
    }
}

struct AdminDashboard: View {
    @StateObject private var viewModel = AdminDashboardViewModel()

    var body: some View {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Gerade Spielender Song
                    CurrentSongPlaying(
                        song: viewModel.currentSong,
                        isPlaying: viewModel.isPlaying,
                        onPlayPause: {
                            Task { await viewModel.togglePlayPause() }
                        }
                    )

                    // Warteschlange
                    QueueCard(songs: viewModel.queueSongs)

                }
                .padding()
            
        }
        .task {
            await viewModel.refreshDashboardState()
        }
        .onReceive(
            Timer.publish(every: 5, on: .main, in: .common).autoconnect()
        ) { _ in
            Task { await viewModel.refreshDashboardState() }
        }

    }
}

#Preview {
    AdminDashboard()
}
