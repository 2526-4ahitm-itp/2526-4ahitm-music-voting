//
//  CurrentSongPlaying.swift
//  app
//
//  Created by Simone Sperrer on 15.01.26.
//

import SwiftUI

struct CurrentSongPlaying: View {

    let song: Song?
    let isPlaying: Bool
    let isLoading: Bool
    var positionMs: Double = 0
    var durationMs: Double = 0
    var deviceActive: Bool = true
    var onPlayPause: () -> Void = {}
    var onNext: () -> Void = {}
    var onPrevious: () -> Void = {}

    private var progressFraction: Double {
        guard durationMs > 0 else { return 0 }
        return min(positionMs / durationMs, 1)
    }

    private func formatTime(_ ms: Double) -> String {
        guard ms.isFinite, ms > 0 else { return "0:00" }
        let totalSeconds = Int(ms / 1000)
        return String(format: "%d:%02d", totalSeconds / 60, totalSeconds % 60)
    }

    var body: some View {
        VStack(spacing: 24) {

            if let song {
                // Album Cover
                AsyncImage(url: URL(string: song.imageUrl)) { phase in
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
                                .foregroundColor(.secondary)
                        }

                    @unknown default:
                        EmptyView()
                    }
                }
                .frame(width: 300, height: 300)
                .cornerRadius(6)
                .clipped()
            }

            // Song Title
            Text(song?.title ?? String(localized: "dashboard.nowPlaying.empty"))
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(.primary)

            Text(song?.artist ?? String(localized: "dashboard.nowPlaying.pressPlay"))
                .font(.subheadline)
                .foregroundColor(.secondary)

            // Progress Bar — mirrors the player position over SSE,
            // matching the host dashboard.
            HStack(spacing: 12) {
                Text(formatTime(positionMs))

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.gray.opacity(0.25))
                        Capsule()
                            .fill(Color("accent"))
                            .frame(width: geo.size.width * progressFraction)
                    }
                }
                .frame(height: 6)
                .animation(.linear(duration: 0.5), value: progressFraction)

                Text(formatTime(durationMs))
            }
            .font(.caption)
            .foregroundColor(.primary)
            .padding(.horizontal)

            // Controls
            HStack(spacing: 50) {
                Button(action: onPrevious) {
                    Image(systemName: "backward.fill")
                        .font(.system(size: 30))
                }
                .disabled(!deviceActive)

                ZStack {
                    Button(action: onPlayPause) {
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 60))
                    }
                    .disabled(isLoading || !deviceActive)

                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle())
                            .scaleEffect(1.2)
                    }
                }

                Button(action: onNext) {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 30))
                }
                .disabled(!deviceActive)
            }
            .foregroundColor(.primary)
            .padding(.top, 10)

            if !deviceActive {
                Text(String(localized: "dashboard.controls.noDevice"))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            Spacer()
        }
        .padding()
        /*.background(
            LinearGradient(
                gradient: Gradient(colors: [Color.black, Color.blue.opacity(0.6)]),
                startPoint: .top,
                endPoint: .bottom
            )
        )*/
        .edgesIgnoringSafeArea(.all)
    }
}

#Preview {
    CurrentSongPlaying(
        song: .init(
            title: "Test",
            artist: "Test",
            imageUrl:
                "https://i.scdn.co/image/ab67616d0000b273a6ca20eceb5f6c7199b98ccb"
        ),
        isPlaying: true,
        isLoading: false
    )
}
