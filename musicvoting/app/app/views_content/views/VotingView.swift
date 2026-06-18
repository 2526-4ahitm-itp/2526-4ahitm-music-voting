//
//  VotingView.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

private struct QueueResponse: Decodable {
    let queue: [QueueTrack]
}

private struct QueueTrack: Decodable {
    let id: String
    let uri: String
    let name: String
    let artists: [Artist]
    let album: Album
    let likeCount: Int
    let hasVoted: Bool
    let isCurrentlyPlaying: Bool

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

private struct VoteResponse: Decodable {
    let liked: Bool
    let likeCount: Int
}

private struct SSEEvent: Decodable {
    let type: String
}

struct VotingEntry: Identifiable {
    let id: String
    let uri: String
    let title: String
    let artist: String
    let imageUrl: String
    var likeCount: Int
    var hasVoted: Bool
    var isCurrentlyPlaying: Bool
}

@MainActor
final class VotingViewModel: ObservableObject {
    @Published var entries: [VotingEntry] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var votingIds: Set<String> = []

    private weak var partySession: PartySessionStore?

    func configure(partySession: PartySessionStore) {
        self.partySession = partySession
    }

    private var queueURL: URL? {
        guard let session = partySession else { return nil }
        let deviceId = session.deviceId
        var components = URLComponents(
            url: session.partyURL(path: "track/queue") ?? BackendConfiguration.endpoint("/api/party/unknown/track/queue"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "deviceId", value: deviceId)]
        return components?.url
    }

    private var voteURL: URL {
        partySession?.partyURL(path: "track/vote") ?? BackendConfiguration.endpoint("/api/party/unknown/track/vote")
    }

    func loadQueue() async {
        guard let url = queueURL else { return }
        isLoading = entries.isEmpty
        defer { isLoading = false }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let response = try JSONDecoder().decode(QueueResponse.self, from: data)
            entries = response.queue.map(Self.mapTrack)
        } catch {
            if entries.isEmpty {
                errorMessage = String(localized: "error.backendUnreachable")
            }
        }
    }

    func toggleVote(entry: VotingEntry) async {
        guard !votingIds.contains(entry.id) else { return }
        votingIds.insert(entry.id)
        defer { votingIds.remove(entry.id) }

        // Optimistic update
        updateEntry(id: entry.id) { e in
            e.hasVoted = !e.hasVoted
            e.likeCount += e.hasVoted ? 1 : -1
        }

        var request = URLRequest(url: voteURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: String] = [
            "uri": entry.uri,
            "deviceId": partySession?.deviceId ?? ""
        ]
        request.httpBody = try? JSONEncoder().encode(body)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode),
                  let voteResponse = try? JSONDecoder().decode(VoteResponse.self, from: data)
            else {
                // Revert optimistic update on failure
                updateEntry(id: entry.id) { e in
                    e.hasVoted = entry.hasVoted
                    e.likeCount = entry.likeCount
                }
                return
            }
            updateEntry(id: entry.id) { e in
                e.hasVoted = voteResponse.liked
                e.likeCount = voteResponse.likeCount
            }
        } catch {
            updateEntry(id: entry.id) { e in
                e.hasVoted = entry.hasVoted
                e.likeCount = entry.likeCount
            }
        }
    }

    func listenForVoteUpdates() async {
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
                          let event = try? JSONDecoder().decode(SSEEvent.self, from: data)
                    else { continue }
                    if event.type == "vote-updated" || event.type == "queue-updated" {
                        await loadQueue()
                    }
                }
            } catch {
                if Task.isCancelled { return }
                try? await Task.sleep(for: .seconds(3))
            }
        }
    }

    private func updateEntry(id: String, mutation: (inout VotingEntry) -> Void) {
        guard let index = entries.firstIndex(where: { $0.id == id }) else { return }
        mutation(&entries[index])
    }

    private static func mapTrack(_ track: QueueTrack) -> VotingEntry {
        let artist = track.artists.map(\.name).joined(separator: ", ")
        return VotingEntry(
            id: track.id,
            uri: track.uri,
            title: track.name,
            artist: artist.isEmpty ? String(localized: "unknown") : artist,
            imageUrl: track.album.images.first?.url
                ?? "https://i.scdn.co/image/ab67616d0000b273a6ca20eceb5f6c7199b98ccb",
            likeCount: track.likeCount,
            hasVoted: track.hasVoted,
            isCurrentlyPlaying: track.isCurrentlyPlaying
        )
    }
}

struct VotingView: View {
    @StateObject private var viewModel = VotingViewModel()
    @EnvironmentObject private var partySession: PartySessionStore

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color("primary"), Color("secondary"), Color("accent")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if viewModel.isLoading {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .padding(.vertical, 40)
                } else if viewModel.entries.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "music.note.list")
                            .font(.system(size: 60))
                            .foregroundStyle(.white.opacity(0.7))
                            .padding(.bottom, 4)
                        Text("voting.queue.empty")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                        Text("voting.queue.emptyHint")
                            .font(.body)
                            .foregroundStyle(.white.opacity(0.8))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                } else {
                    VStack(spacing: 0) {
                        ForEach(viewModel.entries) { entry in
                            VotingRow(
                                entry: entry,
                                isVoting: viewModel.votingIds.contains(entry.id)
                            ) {
                                Task { await viewModel.toggleVote(entry: entry) }
                            }

                            if entry.id != viewModel.entries.last?.id {
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
            .padding()
        }
        .onAppear {
            viewModel.configure(partySession: partySession)
            Task { await viewModel.loadQueue() }
        }
        .task {
            viewModel.configure(partySession: partySession)
            await viewModel.listenForVoteUpdates()
        }
    }
}

private struct VotingRow: View {
    let entry: VotingEntry
    let isVoting: Bool
    let onVote: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: entry.imageUrl)) { image in
                image.resizable().scaledToFill()
                    .frame(width: 52, height: 52)
                    .clipped()
            } placeholder: {
                Color.gray.opacity(0.15)
                    .frame(width: 52, height: 52)
            }
            .clipShape(RoundedRectangle(cornerRadius: 6))

            VStack(alignment: .leading, spacing: 3) {
                Text(entry.title)
                    .font(.headline)
                    .lineLimit(1)
                Text(entry.artist)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            if entry.isCurrentlyPlaying {
                SoundwaveIcon()
            } else {
                HStack(spacing: 6) {
                    if entry.likeCount > 0 {
                        Text("\(entry.likeCount)")
                            .font(.subheadline.monospacedDigit())
                            .fontWeight(.semibold)
                            .foregroundStyle(entry.hasVoted ? Color("accent") : .secondary)
                    }

                    Button(action: onVote) {
                        if isVoting {
                            ProgressView()
                                .frame(width: 28, height: 28)
                        } else {
                            Image(systemName: entry.hasVoted ? "heart.fill" : "heart")
                                .font(.system(size: 20))
                                .foregroundStyle(entry.hasVoted ? Color("accent") : .secondary)
                        }
                    }
                    .disabled(isVoting)
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(entry.isCurrentlyPlaying
            ? Color("accent").opacity(0.07)
            : Color.clear)
    }
}

private struct SoundwaveIcon: View {
    @State private var animate = false

    private let heights: [CGFloat] = [6, 14, 22, 14, 6]
    private let delays: [Double]   = [0, 0.15, 0.3, 0.45, 0.6]

    var body: some View {
        HStack(alignment: .center, spacing: 2) {
            ForEach(0..<5, id: \.self) { i in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color("accent"))
                    .frame(width: 3, height: animate ? heights[i] : heights[i] * 0.25)
                    .animation(
                        .easeInOut(duration: 0.5)
                            .repeatForever(autoreverses: true)
                            .delay(delays[i]),
                        value: animate
                    )
            }
        }
        .frame(width: 32, height: 28)
        .onAppear { animate = true }
    }
}

#Preview {
    VotingView()
        .environmentObject(PartySessionStore())
}
