//
//  SongRow.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

/// Replacement for AsyncImage that loads through URLSession.shared and stores
/// results in ImageCache.shared so every view in the session shares one cache.
struct CachedAsyncImage<Content: View>: View {
    let url: URL?
    @ViewBuilder let content: (UIImage?) -> Content

    @State private var uiImage: UIImage?

    var body: some View {
        content(uiImage)
            .task(id: url) {
                uiImage = await load(url)
            }
    }

    private func load(_ url: URL?) async -> UIImage? {
        guard let url else { return nil }
        if let cached = ImageCache.shared.image(for: url) { return cached }
        guard let (data, _) = try? await URLSession.shared.data(from: url),
              let img = UIImage(data: data) else { return nil }
        ImageCache.shared.store(img, for: url)
        return img
    }
}

struct SongRow: View {
    let song: Song
    var onDelete: () -> Void = {}

    var body: some View {
        HStack(spacing: 12) {
            CachedAsyncImage(url: song.imageUrl.isEmpty ? nil : URL(string: song.imageUrl)) { image in
                if let image {
                    Image(uiImage: image).resizable().scaledToFill()
                        .frame(width: 52, height: 52)
                        .clipped()
                } else {
                    Color(.systemGray5)
                        .frame(width: 52, height: 52)
                        .overlay(
                            Image(systemName: "music.note")
                                .font(.system(size: 18))
                                .foregroundColor(Color(.systemGray2))
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
