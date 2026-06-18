//
//  SongRow.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

struct SongRow: View {
    let song: Song
    var onDelete: () -> Void = {}

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: song.imageUrl)) { phase in
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
                Text(song.title)
                    .font(.headline)
                    .foregroundColor(.primary)
                    .lineLimit(1)
                Text(song.artist)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Button(action: onDelete) {
                ZStack {
                    Circle()
                        .fill(Color("primary").opacity(0.12))
                        .frame(width: 36, height: 36)
                    Image(systemName: "trash")
                        .foregroundColor(Color("primary"))
                        .font(.system(size: 14, weight: .medium))
                }
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}

#Preview {
    SongRow(song: .init(title: "Test", artist: "Test", imageUrl: "https://i.scdn.co/image/ab67616d0000b273a6ca20eceb5f6c7199b98ccb"))
        .padding()
        .background(Color.white)
}
