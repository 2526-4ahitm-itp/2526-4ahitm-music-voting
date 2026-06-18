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
    let deviceActive: Bool?
}

private struct StartPlaybackResponse: Decodable {
    let status: String?
    let track: QueueTrack?
}

private struct ProgressEvent: Decodable {
    let type: String
    let payload: ProgressPayload?

    struct ProgressPayload: Decodable {
        // The backend serializes the LoginEvent payload as Map<String,String>,
        // so position/duration arrive as strings (in milliseconds).
        let position: String?
        let duration: String?
        let paused: String?
    }
}

private struct QueueTrack: Decodable {
    let name: String
    let uri: String?
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
    @Published var isLoading = false
    @Published var partyStarted = false
    @Published var queueSongs: [Song] = []
    @Published var deviceActive = true
    // Playback position mirrored from the /startpage web player via the
    // "progress" SSE event — same source the host dashboard uses.
    @Published var currentPosition: Double = 0
    @Published var currentDuration: Double = 0

    let pollInterval: TimeInterval = 2
    private weak var partySession: PartySessionStore?

    var progressFraction: Double {
        guard currentDuration > 0 else { return 0 }
        return min(currentPosition / currentDuration, 1)
    }

    var controlsDisabled: Bool {
        !deviceActive || (currentSong == nil && queueSongs.isEmpty)
    }

    func configure(partySession: PartySessionStore) {
        self.partySession = partySession
    }

    /// Mirrors the player's progress bar by listening for "progress" SSE events
    /// on the party bus. Reconnects on error, like the other SSE consumers.
    func listenForProgress() async {
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
                          let event = try? JSONDecoder().decode(ProgressEvent.self, from: data)
                    else { continue }

                    if event.type == "progress", let payload = event.payload {
                        currentPosition = payload.position.flatMap(Double.init) ?? 0
                        currentDuration = payload.duration.flatMap(Double.init) ?? 0
                        if let pausedStr = payload.paused {
                            isPlaying = pausedStr != "true"
                        }
                    } else if event.type == "track-changed" {
                        currentPosition = 0
                        currentDuration = 0
                        await refreshDashboardState()
                    }
                }
            } catch {
                if Task.isCancelled { return }
                try? await Task.sleep(for: .seconds(3))
            }
        }
    }

    private func partyURL(for path: String) -> URL {
        partySession?.partyURL(path: path) ?? BackendConfiguration.endpoint("/api/party/unknown/" + path)
    }

    private var queueURL: URL { partyURL(for: "track/queue") }
    private var startURL: URL { partyURL(for: "track/start") }
    private var pauseURL: URL { partyURL(for: "track/pause") }
    private var resumeURL: URL { partyURL(for: "track/resume") }
    private var currentURL: URL { partyURL(for: "track/current") }
    private var nextURL: URL { partyURL(for: "track/next") }
    private var playURL: URL { partyURL(for: "track/play") }
    private var removeURL: URL { partyURL(for: "track/remove") }

    func loadQueue() async {
        do {
            let (data, _) = try await URLSession.shared.data(from: queueURL)
            let response = try JSONDecoder().decode(QueueResponse.self, from: data)
            let allSongs = response.queue.map(Self.mapTrackToSong)

            // Before the party starts, preview the top queued song and keep it in
            // sync as votes reorder the queue — matches webapp behaviour. Once the
            // party has started, currentSong reflects what's actually playing.
            if !partyStarted {
                currentSong = allSongs.first
            }

            // Exclude the currently shown song from the queue list.
            let currentUri = currentSong?.uri
            let filtered = allSongs.filter { song in
                guard let uri = song.uri, let current = currentUri else { return true }
                return uri != current
            }

            if filtered != queueSongs {
                queueSongs = filtered
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
            deviceActive = response.deviceActive ?? true
            if let track = response.track {
                currentSong = Self.mapTrackToSong(track)
            } else {
                currentPosition = 0
                currentDuration = 0
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
        isLoading = true
        defer { isLoading = false }

        if isPlaying {
            await pauseCurrentSong()
        } else if partyStarted {
            await resumeCurrentSong()
        } else {
            await startPlaylist()
        }
    }

    private func startPlaylist() async {
        let previousIsPlaying = isPlaying
        isPlaying = true
        partyStarted = true
        if currentSong == nil, let firstQueuedSong = queueSongs.first {
            currentSong = firstQueuedSong
        }

        if let response: StartPlaybackResponse = await performPostRequest(url: startURL, decode: StartPlaybackResponse.self) {
            // success: confirm UI and set track if provided
            isPlaying = true
            if let track = response.track {
                currentSong = Self.mapTrackToSong(track)
            }
            schedulePlaybackStateRefresh()
        } else {
            // revert UI on failure
            isPlaying = previousIsPlaying
        }
    }

    private func pauseCurrentSong() async {
        let previousIsPlaying = isPlaying
        isPlaying = false

        if await performPostRequest(url: pauseURL) {
            schedulePlaybackStateRefresh()
        } else {
            isPlaying = previousIsPlaying
        }
    }

    private func resumeCurrentSong() async {
        let previousIsPlaying = isPlaying
        isPlaying = true

        if await performPostRequest(url: resumeURL) {
            schedulePlaybackStateRefresh()
        } else {
            isPlaying = previousIsPlaying
        }
    }

    private func hostAuthorizedRequest(url: URL, method: String) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let pin = partySession?.hostPin {
            request.setValue("Bearer \(pin)", forHTTPHeaderField: "Authorization")
        }
        return request
    }

    private func performPostRequest(url: URL) async -> Bool {
        var request = hostAuthorizedRequest(url: url, method: "POST")
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

    private func performPostRequest<T: Decodable>(url: URL, decode type: T.Type) async -> T? {
        var request = hostAuthorizedRequest(url: url, method: "POST")
        request.httpBody = Data("{}".utf8)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                return nil
            }

            if data.isEmpty {
                return nil
            }

            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            return nil
        }
    }

    func deleteSong(uri: String) async {
        guard !uri.isEmpty else { return }
        var request = hostAuthorizedRequest(url: removeURL, method: "DELETE")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["uri": uri])

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse,
               (200...299).contains(httpResponse.statusCode) {
                await loadQueue()
            }
        } catch {}
    }

    func skip() async {
        isLoading = true
        defer { isLoading = false }
        if await performPostRequest(url: nextURL) {
            schedulePlaybackStateRefresh()
        }
    }

    func restartCurrent() async {
        guard let uri = currentSong?.uri else { return }
        isLoading = true
        defer { isLoading = false }
        if await performPutRequest(url: playURL, body: ["uri": uri]) {
            schedulePlaybackStateRefresh()
        }
    }

    private func performPutRequest(url: URL, body: [String: String]) async -> Bool {
        var request = hostAuthorizedRequest(url: url, method: "PUT")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else { return false }
            return (200...299).contains(httpResponse.statusCode)
        } catch {
            return false
        }
    }

    private func schedulePlaybackStateRefresh() {
        Task {
            for delay in [0.25, 0.75, 1.5] {
                try? await Task.sleep(for: .seconds(delay))
                await refreshDashboardState()
            }
        }
    }

    private static func mapTrackToSong(_ track: QueueTrack) -> Song {
        let artistText = track.artists.map(\.name).joined(separator: ", ")
        return Song(
            title: track.name,
            artist: artistText.isEmpty ? String(localized: "unknown") : artistText,
            imageUrl: track.album.images.first?.url
                ?? "https://i.scdn.co/image/ab67616d0000b273a6ca20eceb5f6c7199b98ccb",
            uri: track.uri
        )
    }
}

struct AdminDashboard: View {
    @StateObject private var viewModel = AdminDashboardViewModel()
    @EnvironmentObject private var partySession: PartySessionStore

    var body: some View {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let hostPin = partySession.hostPin {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("dashboard.hostPin")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(hostPin)
                                    .font(.system(size: 28, weight: .bold, design: .monospaced))
                                    .tracking(4)
                            }
                            Spacer()
                            Image(systemName: "crown.fill")
                                .font(.title2)
                                .foregroundStyle(Color("accent"))
                        }
                        .padding()
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
                    }

                    // Gerade Spielender Song
                    CurrentSongPlaying(
                        song: viewModel.currentSong,
                        isPlaying: viewModel.isPlaying,
                        isLoading: viewModel.isLoading,
                        positionMs: viewModel.currentPosition,
                        durationMs: viewModel.currentDuration,
                        deviceActive: viewModel.deviceActive,
                        controlsDisabled: viewModel.controlsDisabled,
                        onPlayPause: { Task { await viewModel.togglePlayPause() } },
                        onNext: { Task { await viewModel.skip() } },
                        onPrevious: { Task { await viewModel.restartCurrent() } }
                    )

                    // Warteschlange
                    QueueCard(songs: viewModel.queueSongs, onDelete: { song in
                        Task { await viewModel.deleteSong(uri: song.uri ?? "") }
                    })

                }
                .padding()

        }
        .task {
            viewModel.configure(partySession: partySession)
            await viewModel.refreshDashboardState()
        }
        .task {
            viewModel.configure(partySession: partySession)
            await viewModel.listenForProgress()
        }
        .onReceive(
            Timer.publish(every: viewModel.pollInterval, on: .main, in: .common).autoconnect()
        ) { _ in
            Task { await viewModel.refreshDashboardState() }
        }

    }
}

#Preview {
    AdminDashboard()
        .environmentObject(PartySessionStore())
}
