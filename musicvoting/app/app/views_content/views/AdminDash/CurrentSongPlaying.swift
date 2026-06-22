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
    var controlsDisabled: Bool = false
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
        VStack(spacing: 18) {
            Spacer().frame(height: 12)
            if let song {
                CachedAsyncImage(url: song.imageUrl.isEmpty ? nil : URL(string: song.imageUrl)) { image in
                    if let image {
                        Image(uiImage: image).resizable().scaledToFill()
                            .frame(width: 270, height: 270)
                            .clipped()
                    } else {
                        Color(.systemGray5)
                            .frame(width: 270, height: 270)
                            .overlay(
                                Image(systemName: "music.note")
                                    .font(.system(size: 50))
                                    .foregroundColor(Color(.systemGray2))
                            )
                    }
                }
                .frame(width: 270, height: 270)
                .clipShape(RoundedRectangle(cornerRadius: 25))
                .shadow(color: .black.opacity(0.15), radius: 12, x: 0, y: 6)
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 25)
                        .fill(Color(.systemGray5))
                    Image(systemName: "music.note")
                        .font(.system(size: 40))
                        .foregroundColor(Color(.systemGray2))
                }
                .frame(width: 220, height: 220)
            }

            VStack(spacing: 4) {
                Text(song?.title ?? String(localized: "dashboard.nowPlaying.empty"))
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                Text(song?.artist ?? String(localized: "dashboard.nowPlaying.pressPlay"))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Progress bar
            HStack(spacing: 10) {
                Text(formatTime(positionMs))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(width: 36)

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color("primary").opacity(0.15))
                        Capsule()
                            .fill(Color("primary"))
                            .frame(width: geo.size.width * progressFraction)
                    }
                }
                .frame(height: 4)
                .animation(.linear(duration: 0.5), value: progressFraction)

                Text(formatTime(durationMs))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(width: 36)
            }
            .padding(.horizontal, 8)

            // Controls
            HStack(spacing: 50) {
                Button(action: onPrevious) {
                    Image(systemName: "backward.fill")
                        .font(.system(size: 30))
                }
                .disabled(controlsDisabled)

                ZStack {
                    Button(action: onPlayPause) {
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 60))
                    }
                    .disabled(isLoading || controlsDisabled)

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
                .disabled(controlsDisabled)
            }
            .foregroundColor(.primary)
            .padding(.top, 10)
            .opacity(controlsDisabled ? 0.35 : 1)

            if !deviceActive {
                Text(String(localized: "dashboard.controls.noDevice"))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(20)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 25))
        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 2)
    }
}

#Preview {
    ZStack {
        LinearGradient(
            colors: [Color("primary"), Color("secondary"), Color("accent")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
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
        .padding()
    }
}
