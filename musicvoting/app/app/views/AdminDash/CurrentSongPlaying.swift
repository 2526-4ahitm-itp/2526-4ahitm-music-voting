//
//  CurrentSongPlaying.swift
//  app
//
//  Created by Simone Sperrer on 15.01.26.
//

import SwiftUI

struct CurrentSongPlaying: View {

    @State private var progress: Double = 0.13
    let song: Song

    var body: some View {
        VStack(spacing: 24) {

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
                            .foregroundColor(.gray)
                    }

                @unknown default:
                    EmptyView()
                }
            }
            .frame(width: 300, height: 300)
            .cornerRadius(6)
            .clipped()

            // Song Title
            Text(song.title)
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(.black)

            Text(song.artist)
                .font(.subheadline)
                .foregroundColor(.gray)

            // Progress Bar
            VStack {
                Slider(value: $progress)
                    .accentColor(.black)

                HStack {
                    Text("0:13")
                    Spacer()
                    Text("2:46")
                }
                .font(.caption)
                .foregroundColor(.black)
            }
            .padding(.horizontal)

            // Controls
            HStack(spacing: 50) {
                Button(action: {}) {
                    Image(systemName: "backward.fill")
                        .font(.system(size: 30))
                }

                Button(action: {}) {
                    Image(systemName: "play.fill")
                        .font(.system(size: 60))
                }

                Button(action: {}) {
                    Image(systemName: "forward.fill")
                        .font(
                            .system(size: 30)
                        )
                }
            }
            .foregroundColor(.black)
            .padding(.top, 10)

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
        )
    )
}
