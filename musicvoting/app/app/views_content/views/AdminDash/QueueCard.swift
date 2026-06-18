//
//  QueueCard.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

struct QueueCard: View {

    let songs: [Song]
    var onDelete: (Song) -> Void = { _ in }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("dashboard.queue.title")
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(Color("primary"))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 8)

            Divider()

            if songs.isEmpty {
                Text("dashboard.queue.empty")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 0) {
                    ForEach(songs) { song in
                        SongRow(song: song, onDelete: { onDelete(song) })

                        if song.id != songs.last?.id {
                            Divider()
                                .padding(.leading, 76)
                        }
                    }
                }
                .padding(.bottom, 8)
            }
        }
        .background(Color.white, in: RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 2)
    }
}

#Preview {
    QueueCard(songs: [])
        .padding()
        .background(Color.purple.opacity(0.3))
}
